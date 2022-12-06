"use strict";
import _ from "underscore";
import CryptoJS from 'crypto-js';
import { proxy, snapshot } from "valtio";

const API_KEY = '431814526122448';
const SECRET = '7kavMkYkmeJ_ccNz34gvxMfeDlk';
const CLOUD_NAME = 'dedktvy6d';

const DEFAULT_STATE = {
  isUploading: false,
  hasErrored: false,
  response: null,
  progress: 0,
  uploadedUrl: ""
};

export default class Uploader {
  constructor() {
    this.state = proxy(DEFAULT_STATE);
  }
  
  reset() {
    const me = this;
    _.each(_.keys(me.state), function(key) {
      if (DEFAULT_STATE[key]) {
        me.state[key] = DEFAULT_STATE[key];
      } else {
        delete me.state[key];
      }
    });
  }
  
  snap() {
    return snapshot(this.state);
  }
  
  retry() {
    this.upload(this.params);
  }

  upload(folder, uri, contentType, callback) {
    const me = this;
    me.params = {
      folder: folder,
      uri: uri,
      contentType: contentType,
      callback: callback
    };
    me.reset();
    try {
      if (!uri) {
        throw new Error('missing URI to upload...😔');
      }
      else if (!contentType) {
        throw new Error('missing contentType to upload...📸📹');
      }
      const apiKey = API_KEY;
      const apiSecret = SECRET;
      const cloud = CLOUD_NAME;
      const timestamp = ((Date.now() / 1000) | 0).toString();
      const hashString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
      const signature = CryptoJS.SHA1(hashString).toString();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud}/${contentType}/upload`;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.onload = () => {
        const res = JSON.parse(xhr.response);
        me.state.response = res;
        me.state.uploadedUrl = res.secure_url;
        if (callback) callback(res);
      };
      xhr.onerror = e => {
        me.state.isUploading = false;
        me.state.hasErrored = true;
        console.log(e, '🚨 story upload failed, never properly sent to server');
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
