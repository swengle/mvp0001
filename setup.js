"use strict";
const $ = {};
$.build_version = require("./build-version.js");
$.env = $.build_version.split('-')[0];

import config from './config';
$.config = config;

import _ from "underscore";
import { Platform, Linking } from 'react-native';
import { proxy } from 'valtio';
import { logger } from "react-native-logs";
import axios from "axios";
import Cache from "./cache";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import messaging from '@react-native-firebase/messaging';
import * as timeago from 'timeago.js';
import uuid from 'react-native-uuid';
import firestore from "./firestore/firestore";
import { doc, onSnapshot } from "firebase/firestore";

$.logger = logger.createLogger();

$.logger.info($.build_version);

$.id = {
  create: function() {
    return uuid.v4();
  }
};

const locale = function(number, index, totalSec) {
  // number: the time ago / time in number;
  // index: the index of array below;
  // totalSec: total seconds between date to be formatted and today's date;
  return [
    ['just now', 'right now'],
    ['%ss ago', 'in %ss'],
    ['1m ago', 'in 1m'],
    ['%sm ago', 'in %sm'],
    ['1h ago', 'in 1h'],
    ['%sh ago', 'in %sh'],
    ['1d ago', 'in 1d'],
    ['%sd ago', 'in %sd'],
    ['1w ago', 'in 1w'],
    ['%sw ago', 'in %sw'],
    ['1mo ago', 'in 1mo'],
    ['%smo ago', 'in %smo'],
    ['1yr ago', 'in 1yr'],
    ['%syr ago', 'in %syr'],
  ][index];
};
timeago.register('en_US', locale);

$.timeago = timeago;

const pkg = (Constants.manifest && Constants.manifest.releaseChannel) ? Constants.manifest.android.package : 'host.exp.exponent';

$.openAppSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    IntentLauncher.startActivityAsync(
      IntentLauncher.ACTION_APPLICATION_DETAILS_SETTINGS,
      { data: 'package:' + pkg },
    );
  }
};

$.axios = axios;

$.axios_api = axios.create({
  baseURL: $.config.app.api_url
});

$.axios_api.interceptors.request.use(
  async function(config) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const id_token = await user.getIdToken();
        config.headers.Authorization = "Bearer " + id_token;
      }
      return config;
    },
    function(error) {
      return Promise.reject(error);
    }
);

$.axios_api.interceptors.response.use(
  res => {
    return res.data;
  },
  async err => {
    console.log(err);
    let e;
    if (err.response && err.response.data && err.response.data.data && err.response.data.data.message) {
      e = new Error(err.response.data.data.message);
      e.status = err.response.status;
    }
    else {
      e = new Error("Unexpected Error");
      e.status = err.response.status || 500;
    }
    throw e;
  }
);

$.firebase = initializeApp($.config.firebase);
$.db = getFirestore($.firebase);
firestore.set_db($.db);

$.display_error = function(toast, e) {
  toast.show(e.message, { type: "danger" });
};

$.auth = proxy({
  cca2: "US"
});
$.app = proxy({});
$.editor = proxy({});
$.cache = new Cache();

$.get_snap_current_user = function() {
  if ($.session) {
    return $.cache.get_snap($.session.uid);
  }
  return;
};

$.get_current_user = function() {
    if ($.session) {
    return $.cache.get($.session.uid);
  }
  return;
};

$.reset_editor = function() {
  _.each(_.keys($.editor), function(key) {
    delete $.editor[key]; 
  });
};

$.check_notification_permissions = async function() {
  const auth_status = await messaging().requestPermission();
  const is_enabled = auth_status === messaging.AuthorizationStatus.AUTHORIZED || auth_status === messaging.AuthorizationStatus.PROVISIONAL;
  if (is_enabled) {
    if ($.session.messaging) {
      return;
    }
    const token = await messaging().getToken();
    onSnapshot(doc($.db, "messaging_config", token), async (doc) => {
      if (doc.exists()) {
        $.session.messaging_config = doc.data();
        return;
      }
      await firestore.create_messaging_config({
        uid: $.session.uid,
        token: token,
      });
    });
  } else {
    delete $.session.messaging;
  }
  return function() {

  };      
};

$.list_fetcher = {
  create: function(params) {
    const base = {
      state: proxy({
        is_refreshing: true,
        refresh_error: undefined,
        is_loading_more: false,
        load_more_error: undefined,
        data: params.data || undefined,
        is_at_end: false
      }),
      method_params: {},
      prepend: [],
      init: function() {
        base.state.data = base.prepend.concat([]);
      },
      set_data: function(data) {
        base.state.data = data;
      },
      insert_first: function(thing_to_insert_first) {
        if (!_.isArray(base.state.data)) {
          base.init();
        }
        if (!_.isArray(thing_to_insert_first)) {
          thing_to_insert_first = [thing_to_insert_first];
        }
        const prepend_size = _.size(base.prepend);
        if (prepend_size === 0) {
          base.state.data = thing_to_insert_first.concat(base.state.data);
          return;
        }
        base.state.data = _.first(base.state.data, prepend_size).concat(thing_to_insert_first).concat(_.rest(base.state.data, prepend_size));
      },
      remove: function(thing_to_remove) {
        base.state.data = _.reject(base.state.data, function(item) {
          return item.id === thing_to_remove.id;
        });
      },
      refresh: async function(params) {
        params = params || {};
        if (params.is_clear_data) {
          _.extend(base.state, { is_refreshing: true, refresh_error: undefined, data: undefined, is_at_end: false });
        }
        else {
          _.extend(base.state, { is_refreshing: true, refresh_error: undefined, is_at_end: false });
        }
        if (base.url) {
          delete base.method_params.cursor;
          try {
            const result = await $.axios_api.get(base.url, { params: base.method_params, timeout: params.timeout || 8000 });
            let data = result.data.data;
            if (base.normalizer) {
              data = base.prepend.concat(base.normalizer(data));
            }
            else {
              data = base.prepend.concat(data);
            }
            if (result.meta && result.meta.next_cursor) {
              base.next_cursor = result.meta.next_cursor;
            }
            _.extend(base.state, { is_refreshing: false, last_refresh_time: Date.now(), data: data });
          }
          catch (e) {
            _.extend(base.state, { is_refreshing: false, refresh_error: e});
            throw e;
          }
        }
      },
      more: async function(params) {
        params = params || {};
        if (base.state.is_refreshing || base.state.is_loading_more || !base.next_cursor) {
          return;
        }
        _.extend(base.state, { is_loading_more: true, load_more_error: undefined });
        if (base.url) {
          base.method_params.cursor = base.next_cursor;
          try {
            const result = await $.axios_api.get(base.url, { params: base.method_params, timeout: params.timeout || 8000 });
            let data = result.data.data;
            const new_length = _.size(data) + _.size(base.state.data);
            let is_max_length = false;
            if (base.max_length) {
              if (new_length >= base.max_length) {
                is_max_length = true;
              }
            }
            if (!is_max_length && result.meta && result.meta.next_cursor) {
              base.next_cursor = result.meta.next_cursor;
            }
            else {
              delete base.next_cursor;
            }
            _.extend(base.state, { is_loading_more: false, last_more_time: Date.now(), is_at_end: !_.isString(base.next_cursor) });
            if (base.normalizer) {
              _.each(base.normalizer(data), function(item) {
                base.state.data.push(item);
              });
            }
            else {
              _.each(data, function(item) {
                base.state.data.push(item);
              });
            }
          }
          catch (e) {
            _.extend(base.state, { is_loading_more: false, load_more_error: e });
            throw e;
          }

        }

      }
    };
    _.extend(base, params);
    return base;
  }
};


export default $;
