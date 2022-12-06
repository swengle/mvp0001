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
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingFailed, setIsSavingFailed] = useState(false);
  const snap_editor = useSnapshot($.editor);
  const snap_uploader = $.editor.uploader.snap();
  const [uploadResponse, setUploadResponse] = useState(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const unsubscribe = subscribeKey($.editor.uploader.state, "response", (response) => {
      setUploadResponse(response);
    });
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    if (isSaving && uploadResponse) {
      save(uploadResponse);
    }
  }, [uploadResponse]);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_press_send = function() {
    setIsSaving(true);
    if (snap_uploader.response) {
      setUploadResponse(snap_uploader.response);
    }
  };
  
  const save = async function(response) {
    setIsSavingFailed(false);
    try {
      const data = (await $.axios_api.post("/posts", {image: response, emoji: snap_editor.emoji})).data;
      $.get_current_user().current_post = data;
      navigation.navigate("StackTabs");
    } catch (e) {
      $.display_error(toast, e);
      setIsSavingFailed(true);
    } finally {
      setIsSaving(false);
    }
  };
  
  const on_press_retry = function() {
    setIsSaving(false);
    $.editor.uploader.upload($.editor.pic.uri, "image");
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
            </TouchableOpacity>
          </View>
          
          <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", position: "absolute", left: 0, bottom: 48, width: width}}>
            {isSavingFailed && (<View><Button style={{marginTop: 40}} mode="contained" onPress={on_press_send}>Retry</Button><HelperText type="error">Something went wrong!</HelperText></View>)}
            {(!isSavingFailed && !isSaving && !snap_uploader.hasErrored) && <Button style={{marginTop: 40}} mode="contained" onPress={on_press_send}>Send</Button>}
            {(!isSavingFailed && isSaving && !snap_uploader.hasErrored && snap_uploader.isUploading) && <ActivityIndicator style={{marginTop: 40}} animating={true}/>}
            {(!isSavingFailed && isSaving && snap_uploader.hasErrored) && (<View><Button style={{marginTop: 40}} mode="contained" onPress={on_press_retry}>Retry</Button><HelperText type="error">Something went wrong!</HelperText></View>)}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default DetailsScreen;