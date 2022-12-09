"use strict";
import $ from "../setup";
import _ from "underscore";
import CryptoJS from 'crypto-js';
import { proxy } from "valtio";

const DEFAULT_STATE = {
  isUploading: false,
  hasErrored: false,
  response: null,
  progress: 0,
  uploadedUrl: ""
};

export default class Uploader {
  constructor(config) {
    this.state = proxy(DEFAULT_STATE);
  }
  
  retry() {
    this.upload(...this.params);
  }

  upload(folder, uri, contentType, callback) {
    const me = this;
    if (me.state.isUploading && !me.state.hasErrored) {
      throw new Error("Invalid upload state");
    }
    me.params = [folder, uri, contentType, callback];
    try {
      if (!uri) {
        throw new Error('missing URI to upload...😔');
      }
      else if (!contentType) {
        throw new Error('missing contentType to upload...📸📹');
      }

      _.extend(me.state, DEFAULT_STATE);
      
      const apiKey = $.config.cloudinary.api_key;
      const apiSecret = $.config.cloudinary.secret;
      const cloud = $.config.cloudinary.cloud_name;
      const timestamp = ((Date.now() / 1000) | 0).toString();
      const hashString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(hashString).toString();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/${contentType}/upload`;


      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.onload = () => {
        me.state.isUploading = false;
        const res = JSON.parse(xhr.response);
        if (_.has(res, "error")) {
          me.state.hasErrored = true;
          console.log('🚨 upload failed, never properly sent to server');
          return;
        }
        me.state.response = res;
        me.state.uploadedUrl = res.secure_url;
        if (callback) callback(res);
      };
      xhr.onerror = e => {
        me.state.isUploading = false;
        me.state.hasErrored = true;
        console.log(e, '🚨 upload failed, never properly sent to server');
      };
      xhr.ontimeout = e => {
        me.stateisUploading = false;
        me.state.hasErrored = true;
        console.warn(e, '⏰ server upload timed out');
      };

      let array = uri.split('.');
      let fileEnding = array[array.length - 1].toLowerCase();
      fileEnding = fileEnding || 'jpg';

      const formData = new FormData();

      formData.append('file', {
        uri: uri,
        type: `${contentType}/${fileEnding}`,
        name: `upload.${fileEnding}`,
      });
      formData.append('timestamp', timestamp);
      formData.append('api_key', apiKey);
      formData.append('signature', signature);
      formData.append('folder', folder);
      me.state.isUploading = true;
      xhr.send(formData);
      if (xhr.upload) {
        xhr.upload.onprogress = ({ total, loaded }) => {
          me.state.progress = (loaded / total);
        };
      }
    }
    catch (e) {
      console.error('upload to cloudinary hook error', e);
    }
  }
}
