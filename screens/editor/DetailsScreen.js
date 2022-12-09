"use strict";
import $ from "../../setup.js";
import { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, IconButton } from "react-native-paper";
import { useSnapshot } from "valtio";
import { subscribeKey } from 'valtio/utils';
import { useToast } from "react-native-toast-notifications";
import { SafeAreaView } from 'react-native-safe-area-context';

const SIZE = 1080;
const WINDOW_SIZE = 390;
const MARGIN_RIGHT = 10;
const MARGIN_TOP = 10;
const CIRCLE_SIZE = 100;
const EMOJI_SIZE = 64;
const OPACITY = 0.4;

const DetailsScreen = function({navigation, route}) {
  const toast = useToast();
  const [is_saving, set_is_saving] = useState(false);
  const [is_saving_failed, set_is_saving_failed] = useState(false);
  const [is_retry, set_is_retry] = useState(false);
  
  const snap_editor = useSnapshot($.editor);
  const snap_uploader = useSnapshot($.uploader.state);
  
  const { width } = useWindowDimensions();

  useEffect(() => {
    const unsubscribe = subscribeKey($.uploader.state, "response", (response) => {
      if (is_saving) {
        save(response);
      }
    });
    return unsubscribe;
  }, []);
  
  const on_press_send = async function() {
    if ($.uploader.state.hasErrored) {
      set_is_saving_failed(true);
      return;
    }
    set_is_saving(true);
    if ($.uploader.state.response) {
      await save($.uploader.state.response);
    }
  };
  
  const save = async function(response) {
    set_is_saving_failed(false);
    try {
      const data = (await $.axios_api.post("/posts", {image: response, emoji: snap_editor.emoji})).data;
      $.get_current_user().current_post = data;
      navigation.navigate("StackTabs");
    } catch (e) {
      $.display_error(toast, new Error("Failed to save image."));
      set_is_saving_failed(true);
    } finally {
      set_is_saving(false);
    }
  };
  
  const on_press_retry = async function() {
    set_is_saving_failed(false);
    set_is_retry(true);
    if ($.uploader.state.hasErrored) {
      $.uploader.retry();
      return;
    } else {
      set_is_saving(true);
      await save($.uploader.state.response);
    }
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const ratio = width/1080;
  const picture_height = snap_editor.pic ? Math.round(snap_editor.pic.height * ratio) : 0;
  
  return (
    <SafeAreaView style={{flex: 1}}>
      {!snap_editor.pic && (
        <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <ActivityIndicator animating={true}/>
        </View>
      )}
      {(snap_editor.pic && snap_editor.pic.uri) && (
        <View style={{flex: 1}}>
          <IconButton icon={"chevron-left"} mode="contained" onPress={on_press_back}/>
          <View>
            <Image source={{ uri: snap_editor.pic.uri }} style={{ width: width, height: picture_height }} />
            
            <TouchableOpacity style={{position: "absolute", right: MARGIN_RIGHT, top: MARGIN_TOP, width: CIRCLE_SIZE, height: CIRCLE_SIZE}} onPress={on_press_back}>
              <View style={{position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, opacity: OPACITY, backgroundColor: "black", borderRadius: CIRCLE_SIZE/2}}/>
              <View style={{position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE/2, borderWidth: 2, borderColor: "white"}}/>
              <View style={{position: "absolute", width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: "center", justifyContent: "center"}}>
                <Text style={{ fontFamily: "TwemojiMozilla", fontSize: EMOJI_SIZE, width: EMOJI_SIZE}}>{snap_editor.emoji.base}</Text>
              </View>
              <Text>{snap_uploader.hasErrored }</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", position: "absolute", left: 0, bottom: 48, width: width}}>
            {(!is_saving_failed && (is_saving || is_retry) && !snap_uploader.hasErrored && snap_uploader.isUploading) && <ActivityIndicator style={{marginTop: 40}} animating={true}/>}
            
            {(!is_saving_failed && !is_saving && !snap_uploader.isUploading && !is_retry) && <Button style={{marginTop: 40}} mode="contained" onPress={on_press_send}>Send</Button>}
            
            {(is_saving_failed || ((is_saving || is_retry) && snap_uploader.hasErrored)) && (<View><Button style={{marginTop: 40}} mode="contained" onPress={on_press_retry}>Retry</Button><HelperText type="error">Something went wrong.</HelperText></View>)}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default DetailsScreen;