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
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import messaging from '@react-native-firebase/messaging';
import * as timeago from 'timeago.js';
import firestore from "./firestore/firestore";
import { doc, getDoc } from "firebase/firestore";
import useCachedData from "./hooks/useCachedData";
import { getFunctions, httpsCallable } from "firebase/functions";

$.emoji_data = require("./assets/emoji.json");

$.emoji_data_by_char = {};
_.each($.emoji_data, function(emoji) {
  $.emoji_data_by_char[emoji.char] = emoji;
});

$.emoji_data_by_group = _.groupBy($.emoji_data, "group");

$.logger = logger.createLogger();

$.logger.info($.build_version);

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
  }
  else {
    IntentLauncher.startActivityAsync(
      IntentLauncher.ACTION_APPLICATION_DETAILS_SETTINGS, { data: 'package:' + pkg },
    );
  }
};

$.axios = axios;
$.firebase = initializeApp($.config.firebase);
$.db = getFirestore($.firebase);
firestore.set_$($);

$.display_error = function(toast, e) {
  toast.show(e.message, { type: "danger" });
};

$.auth = proxy({ cca2: "US" });
$.app = proxy({});
$.editor = proxy({});

$.get_snap_current_user = function() {
  if ($.session && $.session.uid) {
    return useCachedData.cache_get_snap($.session.uid);
  }
};

$.get_current_user = function() {
  if ($.session && $.session.uid) {
    return useCachedData.cache_get($.session.uid);
  }
};

$.reset_editor = function() {
  _.each(_.keys($.editor), function(key) {
    delete $.editor[key];
  });
};


const functions = getFunctions();
$.cf = {};
$.cf.from_contacts = httpsCallable(functions, 'from_contacts');
$.cf.get_auth_token = httpsCallable(functions, 'get_auth_token');
$.cf.get_global_counts = httpsCallable(functions, 'get_global_counts');

$.check_notification_permissions = async function() {
  const auth_status = await messaging().requestPermission();
  const is_enabled = auth_status === messaging.AuthorizationStatus.AUTHORIZED || auth_status === messaging.AuthorizationStatus.PROVISIONAL;
  if (is_enabled) {
    if ($.session.messaging) {
      return;
    }
    const token = await messaging().getToken();
    const doc_ref = doc($.db, "users/" + $.session.uid + "/messaging_configs", token);
    const doc_snap = await getDoc(doc_ref);
    if (doc_snap.exists()) {
      $.session.messaging_config = doc_snap.data();
      return;
    }
    else {
      await firestore.create_messaging_config({
        token: token
      });
    }
  }
  else {
    delete $.session.messaging_config;
  }
  return function() {

  };
};

export default $;
