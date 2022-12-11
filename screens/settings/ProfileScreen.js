"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { Platform, Keyboard, KeyboardAvoidingView, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, TextInput } from "react-native-paper";
import Header from "../../components/Header";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActivityIndicator, Button, HelperText, useTheme } from 'react-native-paper';
import { subscribeKey } from 'valtio/utils';
import { useToast } from "react-native-toast-notifications";
import { useSnapshot } from "valtio";
import firestore from "../../firestore/firestore";
import Uploader from "../../components/Uploader";

const user_name_regex = /^[a-zA-Z0-9_][a-zA-Z0-9_.]*/;

const get_diff_in_hours = function(start_date, end_date) {
  const ms_in_hour = 1000 * 60 * 60;

  return Math.round(Math.abs(end_date - start_date) / ms_in_hour);
};

$.profile_image_uploader = new Uploader();

const ProfileScreen = function({navigation}) {
  const toast = useToast();
  const { colors } = useTheme();
  const snap_uploader = useSnapshot($.profile_image_uploader.state);
  const snap_current_user = $.get_snap_current_user();
  const [is_saving, set_is_saving] = useState(false);
  const [is_saving_error, set_is_saving_error] = useState(false);
  
  const [username, set_username] = useState(snap_current_user.username);
  const [name, set_name] = useState(snap_current_user.name);
  const [bio, set_bio] = useState(snap_current_user.bio);
  const [is_dirty, set_is_dirty] = useState(false);
  const [is_saving_profile, set_is_saving_profile] = useState(false);
  const [is_saving_profile_error, set_is_saving_profile_error] = useState(false);
  const [is_username_valid, set_is_username_valid] = useState(true);
  const [is_name_valid, set_is_name_valid] = useState(true);
  
  const save_user = async function(params) {
    params.id = $.session.uid;
    try {
      set_is_saving(true);
      await firestore.update_user(params);
      $.reset_editor();
    } catch (e) {
      console.log(e);
      $.display_error(toast, new Error("Failed to update profile image."));
      set_is_saving_error(true);
    } finally {
      set_is_saving(false);
    }
  };
  
  useEffect(() => {
    const unsubscribe = subscribeKey($.profile_image_uploader.state, "response", async (response) => {
      if (response) {
        await save_user({profile_image_url: response.secure_url});
      }
    });
    return unsubscribe;
  }, []);
  
  const check_if_dirty = function() {
    if ((name !== snap_current_user.name || username !== snap_current_user.username || bio !== snap_current_user.bio)) {
      set_is_dirty(true);
    } else {
      set_is_dirty(false);
    }
  };

  useEffect(() => {
    check_if_dirty();
  }, [name, username, bio]);

  const on_press_back = function() {
    navigation.goBack();
  };
   
  const on_press_edit_profile_image = function() {
    navigation.push("EditorStack", {screen: "CameraScreen", params: { source: "profile_image" }});
  };
  
  const retry = async function() {
    set_is_saving_error(false);
    if (!snap_uploader.response) {
      $.profile_image_uploader.retry(); 
    } else {
      await save_user({profile_image_url: snap_uploader.response.secure_url});
    }
  };
  
  const is_save_error = is_saving_error || snap_uploader.hasErrored;
  
  const on_press_save = async function() {
    Keyboard.dismiss();
    const params = {
      id: $.session.uid
    };
    if (name !== snap_current_user.name) {
      params.name = name;
    }
    if (username !== snap_current_user.username ) {
      params.username = username;
    }
    if (bio !== snap_current_user.bio) {
      params.bio = bio;
    }
    
    if (_.size(params) === 0) {
      set_is_dirty(false);
      return;
    }
    
    try {
      set_is_saving_profile_error(false);
      set_is_saving_profile(true);
      await firestore.update_user(params);
      set_is_dirty(false);
    } catch (e) {
      $.display_error(toast, new Error("Failed to update user."));
      set_is_saving_profile_error(true);
    } finally {
      set_is_saving_profile(false);
    }
  };
  
  const on_change_text_name = function(val) {
    set_name(val);
    val = val.trim();
    if (val.length > 65) {
      set_is_name_valid(false);
    } else {
      set_is_name_valid(true);
    }
  };
  
  const on_change_text_username = function(val) {
    set_username(val);
    if (val.length > 0 && val.length < 65 && user_name_regex.test(val)) {
      set_is_username_valid(true);
    } else {
      set_is_username_valid(false);
    }
  };
  
  let header_right = null;
  if (is_saving_profile) {
    header_right = <ActivityIndicator style={{marginRight: 10}}/>;
  } else if (is_dirty && is_username_valid && is_name_valid) {
    header_right = <Button onPress={on_press_save}>Save</Button> ;
  }
  
  let is_can_edit_username = false;
  const last_update_at = snap_current_user.change_username_at.toDate();
  const delta = get_diff_in_hours(new Date(), last_update_at);
  if (delta > (24 * 30)) {
    is_can_edit_username = true;
  }
  
  let target_date = last_update_at;
  target_date.setDate(target_date.getDate() + 30);
  
  const time_left = target_date.getTime() - Date.now();
  
  
  const days = Math.floor(time_left / (1000 * 60 * 60 * 24));
  const hours = Math.floor((time_left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  let remaining = "(" + days + (days === 1 ? " day" : " days") + " " + hours + (hours === 1 ? " hour" : " hours") + ")";
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Header on_press_back={on_press_back} title="Profile Settings" right={header_right}/>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <ScrollView style={{flex: 1, padding: 10}}>
          <View style={{marginTop: 20, alignItems: "center"}}>
            <TouchableOpacity onPress={on_press_edit_profile_image}>
              {snap_current_user.profile_image_url && <Avatar.Image size={100} source={{uri: snap_current_user.profile_image_url}} />}
              <View style={{position: "absolute", bottom: 0, right: 0, backgroundColor: colors.background, borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center"}}>
                {(is_save_error) && (
                  <MaterialCommunityIcons name="close" size={28} color={colors.error}/>
                )}
                {!is_save_error && !(snap_uploader.isUploading || is_saving) && <MaterialCommunityIcons name="camera" size={28}  color={colors.primary}/>}
                {!is_save_error && (snap_uploader.isUploading || is_saving) && <ActivityIndicator size={28}/>}
              </View>
            </TouchableOpacity>
            
            {(is_save_error) && (
              <Button onPress={retry}>Retry</Button>
            )}
          </View>
          
          <View style={{marginTop: 40, marginBottom: 100}}>
            <TextInput label="Name" value={name} onChangeText={on_change_text_name}/>
            {!is_name_valid && <HelperText>Name is invalid.</HelperText>}
            <TextInput style={{marginTop: 20}} label="Bio" value={bio} multiline={true} onChangeText={set_bio}/>
            
            <TextInput style={{marginTop: 50}} label="Username" value={username} autoCapitalize={"none"} autoComplete={"off"} autoCorrect={false} selectTextOnFocus={false} onChangeText={on_change_text_username} disabled={!is_can_edit_username}/>
            {!is_username_valid && <HelperText>Username is invalid.</HelperText>}
            {is_username_valid && <HelperText>Username can be updated in {remaining}.</HelperText>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default ProfileScreen;