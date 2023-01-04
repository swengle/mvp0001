"use strict";
import $ from "../../setup.js";
import { Fragment, useEffect, useState } from "react";
import { Platform, KeyboardAvoidingView, Image, Keyboard, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, HelperText, TextInput } from "react-native-paper";
import { useSnapshot } from "valtio";
import { subscribeKey } from 'valtio/utils';
import { useToast } from "react-native-toast-notifications";
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import EmojiOverlay from "../../components/EmojiOverlay";
import useCachedData from "../../hooks/useCachedData";
import * as Location from 'expo-location';

const DetailsScreen = function({navigation, route}) {
  const toast = useToast();
  
  const [caption_value, set_caption_value] = useState($.editor.caption_value);
  const [location_permission_status, set_location_permission_status] = useState(null);
  const [location, set_location] = useState(null);

  const snap_editor = useSnapshot($.editor);
  const snap_uploader = useSnapshot($.uploader.state);
  
  const { width } = useWindowDimensions();

  useEffect(() => {
    const unsubscribe = subscribeKey($.uploader.state, "response", (response) => {
      if ($.uploader.state.is_saving) {
        save(response);
      }
    });

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      set_location_permission_status(status);
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      set_location(location);
      console.log(location);
    })();

    return function() {
      delete $.uploader.state.is_saving;
      delete $.uploader.state.is_saving_failed;
      delete $.uploader.state.is_retry;
      unsubscribe();
    };
  }, []);
  
  const on_press_send = async function() {
    if ($.uploader.state.hasErrored) {
      $.uploader.state.is_saving_failed = true;
      return;
    }
    $.uploader.state.is_saving = true;
    if ($.uploader.state.response) {
      await save($.uploader.state.response);
    }
  };
  
  const save = async function(response) {
    $.uploader.state.is_saving_failed = false;
    try {
      const new_post = await firestore.create_post({image: response, emoji_char: snap_editor.emoji.char, emoji_group: snap_editor.emoji.group});
      useCachedData.cache_set(new_post);
      navigation.navigate("StackTabs");
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Failed to save image."));
      $.uploader.state.is_saving_failed = true;
    } finally {
      $.uploader.state.is_saving = false;
    }
  };
  
  const on_press_retry = async function() {
    $.uploader.state.is_saving_failed = false;
    $.uploader.state.is_retry = true;
    if ($.uploader.state.hasErrored) {
      $.uploader.retry();
      return;
    } else {
      $.uploader.state.is_saving = true;
      await save($.uploader.state.response);
    }
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_change_text_caption = function(value) {
    set_caption_value(value);
    $.editor.caption_value = value;
  };
  
  const on_press_image = function() {
    Keyboard.dismiss();
  };
  
  const ratio = width/1080;
  const picture_height = snap_editor.pic ? Math.round(snap_editor.pic.height * ratio) : 0;
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={["top", "right", "left", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
          {!snap_editor.pic && (
            <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
              <ActivityIndicator animating={true}/>
            </View>
          )}
          {(snap_editor.pic && snap_editor.pic.uri) && (
            <Fragment>
              <Appbar.Header>
                <Appbar.BackAction onPress={on_press_back} />
                <Appbar.Content title=""/>
                  {(!snap_uploader.is_saving_failed && (snap_uploader.is_saving || snap_uploader.is_retry) && !snap_uploader.hasErrored) && <ActivityIndicator animating={true}/>}
                  {(!snap_uploader.is_saving_failed && !snap_uploader.is_saving && !snap_uploader.is_retry) && <Button  mode="contained" onPress={on_press_send}>Send</Button>}
                  {(snap_uploader.is_saving_failed || ((snap_uploader.is_saving || snap_uploader.is_retry) && snap_uploader.hasErrored)) && (<View style={{flexDirection: "row", alignItems: "center"}}><HelperText type="error">Something went wrong.</HelperText><Button mode="contained" onPress={on_press_retry}>Retry</Button></View>)}
              </Appbar.Header>
              <ScrollView style={{flex: 1}} keyboardShouldPersistTaps='always'>
                <Pressable onPress={on_press_image}>
                  <Image source={{ uri: snap_editor.pic.uri }} style={{ width: width, height: picture_height }} />
                </Pressable>
                <EmojiOverlay on_press={on_press_back} emoji_char={snap_editor.emoji.char} scaling_factor={1}/>
                <TextInput
                  label="Caption"
                  onChangeText={on_change_text_caption}
                  maxLength={1024}
                  value={caption_value}
                  autoCorrect={true}
                  multiline={true} 
                  scrollEnabled={false}
                />
                <Pressable onPress={() => alert('Hi!')}>
                  <View pointerEvents="none">
                    <TextInput
                      label="Location"
                      value={"Millis, MA"}
                    />
                  </View>
                </Pressable>
              </ScrollView>
            </Fragment>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
};


export default DetailsScreen;