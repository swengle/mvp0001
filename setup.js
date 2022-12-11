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

export default $;
