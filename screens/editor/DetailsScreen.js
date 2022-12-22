"use strict";
import $ from "../../setup.js";
import { useEffect } from "react";
import { Image, useWindowDimensions, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, HelperText } from "react-native-paper";
import { useSnapshot } from "valtio";
import { subscribeKey } from 'valtio/utils';
import { useToast } from "react-native-toast-notifications";
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import EmojiOverlay from "../../components/EmojiOverlay";
import useCachedData from "../../hooks/useCachedData";

const DetailsScreen = function({navigation, route}) {
  const toast = useToast();
  
  const snap_editor = useSnapshot($.editor);
  const snap_uploader = useSnapshot($.uploader.state);
  
  const { width } = useWindowDimensions();

  useEffect(() => {
    const unsubscribe = subscribeKey($.uploader.state, "response", (response) => {
      if ($.uploader.state.is_saving) {
        save(response);
      }
    });
    
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
  
  const ratio = width/1080;
  const picture_height = snap_editor.pic ? Math.round(snap_editor.pic.height * ratio) : 0;
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={["right", "bottom", "left"]}>
      {!snap_editor.pic && (
        <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <ActivityIndicator animating={true}/>
        </View>
      )}
      {(snap_editor.pic && snap_editor.pic.uri) && (
        <View style={{flex: 1}}>
          <Appbar.Header>
              <Appbar.BackAction onPress={on_press_back} />
          </Appbar.Header>
          <View>
            <Image source={{ uri: snap_editor.pic.uri }} style={{ width: width, height: picture_height }} />
            <EmojiOverlay on_press={on_press_back} emoji_char={snap_editor.emoji.char} scaling_factor={1}/>
          </View>
          
          <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center", position: "absolute", left: 0, bottom: 48, width: width}}>
            {(!snap_uploader.is_saving_failed && (snap_uploader.is_saving || snap_uploader.is_retry) && !snap_uploader.hasErrored) && <ActivityIndicator style={{marginTop: 40}} animating={true}/>}
            
            {(!snap_uploader.is_saving_failed && !snap_uploader.is_saving && !snap_uploader.is_retry) && <Button style={{marginTop: 40}} mode="contained" onPress={on_press_send}>Send</Button>}
            
            {(snap_uploader.is_saving_failed || ((snap_uploader.is_saving || snap_uploader.is_retry) && snap_uploader.hasErrored)) && (<View><Button style={{marginTop: 40}} mode="contained" onPress={on_press_retry}>Retry</Button><HelperText type="error">Something went wrong.</HelperText></View>)}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};


export default DetailsScreen;