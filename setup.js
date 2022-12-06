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
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import Uploader from "./components/Uploader";
import messaging from '@react-native-firebase/messaging';

$.logger = logger.createLogger();

$.logger.info($.build_version);

$.data = {};
$.data.countries = require("./data/countries.json");


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


$.data.countries_by_cca2 = {};
_.each($.data.countries, function(country, idx) {
  $.data.countries_by_cca2[country.cca2] = country;
});

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

$.display_error = function(toast, e) {
  toast.show(e.message, { type: "danger" });
};

$.auth = proxy({
  cca2: "US"
});
$.app = proxy({});
$.editor = proxy({
  uploader: new Uploader()
});
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
    if (key === "uploader") {
      $.editor.uploader.reset();
    } else {
      delete $.editor[key]; 
    }
  });
};

$.check_notification_permissions = async function() {
  const current_user = $.get_current_user();
  const auth_status = await messaging().requestPermission();
  $.session.messaging_requested = true;
  const is_enabled = auth_status === messaging.AuthorizationStatus.AUTHORIZED || auth_status === messaging.AuthorizationStatus.PROVISIONAL;
  if (is_enabled) {
    const token = await messaging().getToken();
    if (current_user.settings_messaging[token]) {
      $.session.messaging_token = token;
    } else {
      try {
        const data = (await $.axios_api.post("/users/me/messaging-token", {token: token})).data;
        current_user.settings_messaging[token] = data;
        $.session.messaging_token = token; 
      } catch (e) {
        console.log(e);
      }
    }
  } else {
    delete $.session.messaging_token;
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
        const start = Date.now();
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
            let data = result.data;
            if (base.normalizer) {
              data = base.prepend.concat(base.normalizer(data));
            }
            else {
              data = base.prepend.concat(data);
            }
            if (result.meta && result.meta.next_cursor) {
              base.next_cursor = result.meta.next_cursor;
            }
            if (params.min_time) { // in tab view fast initial refresh can cause problems
              const delta = Date.now() - start;
              if (delta < params.min_time) {
                _.delay(function() {
                  _.extend(base.state, { is_refreshing: false, last_refresh_time: Date.now(), data: data });
                }, params.min_time - delta);
                return;
              }
            }
            _.extend(base.state, { is_refreshing: false, last_refresh_time: Date.now(), data: data });
          }
          catch (e) {
            _.extend(base.state, { is_refreshing: false, refresh_error: e});
            if (params.auto_display_error) {
              $.handle_common_errors(e);
            } else {
              throw e; 
            }
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
            let data = result.data;
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
            if (params.auto_display_error) {
              $.handle_common_errors(e);
            } else {
              throw e; 
            }
          }

        }

      }
    };
    _.extend(base, params);
    return base;
  }
};


export default $;
