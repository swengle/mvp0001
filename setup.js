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

$.logger = logger.createLogger();

$.logger.info($.build_version);

$.data = {};
$.data.countries = require("./data/countries.json");

const pkg = Constants.manifest.releaseChannel ? Constants.manifest.android.package : 'host.exp.exponent';

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

$.get_current_user = function() {
  return $.cache.get($.app.user_id);
};

$.display_error = function(toast, e) {
  toast.show(e.message, { type: "danger" });
};

$.auth = proxy({
  cca2: "US"
});
$.app = proxy({});

$.cache = new Cache();

export default $;
