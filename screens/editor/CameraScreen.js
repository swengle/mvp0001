"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { useRef, useState } from "react";
import { Image, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useSnapshot } from 'valtio';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from "react-native-toast-notifications";

const CameraScreen = function({ navigation, route }) {
  const toast = useToast();
  let source = "new_pic";
  if (route && route.params && route.params.source === "profile_image") {
    source = route.params.source;
  }
  const editor_snap = useSnapshot($.editor);
  const current_user = $.get_snap_current_user();
  const {width} = useWindowDimensions();
  const ref_camera = useRef();
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);

  const on_press_close = function() {
    navigation.goBack();
  };

  let flash_icon, type_icon;

  if (flashMode === FlashMode.on) {
    flash_icon = "flash";
  } else if (flashMode === FlashMode.off) {
    flash_icon = "flash-off";
  } else if (flashMode === FlashMode.auto) {
    flash_icon = "flash-auto";
  }
  
  if (cameraType === CameraType.back) {
    type_icon = "camera-rear";
  } else if (CameraType.front) {
    type_icon = "camera-front";
  }
  
  const on_press_flash = function() {
    if (flash_icon === "flash-off") {
      setFlashMode(FlashMode.auto);
      flash_icon = "flash-auto";
    } else if (flash_icon === "flash") {
      setFlashMode(FlashMode.off);
      flash_icon = "flash-off";
    } else {
      setFlashMode(FlashMode.on);
      flash_icon = "flash";
    }
  };
  
  const on_press_type = async function() {
    if (type_icon === "camera-rear") {
      setCameraType(CameraType.front);
      type_icon = "camera-front";
    } else {
      setCameraType(CameraType.back);
      type_icon = "camera-rear";
    }
  };
  
  const on_press_take_picture = async function() {
    ref_camera.current.takePictureAsync({quality: 0.85, onPictureSaved: async function(pic) {
      let height;
      if (source === "new_pic") {
        height = 1350;
      }
      $.editor.pic = await ImageManipulator.manipulateAsync(pic.uri, [{resize: {height: height, width: source === "new_pic" ? 1080 : 110}}], {compress: source === "new_pic" ? 0.9 : 1});
      $.editor.uploader.reset();
      $.editor.uploader.upload(current_user.id + (source === "new_pic" ? "/images" : "/profile_images"), $.editor.pic.uri, "image");
      if (flashMode === FlashMode.off && source === "new_pic") {
        ref_camera.current.resumePreview();
      } else {
        if (source === "profile_image") {
          navigation.goBack();
          return;
        }
        navigation.push("SelectEmojiScreen"); 
      }
    }});
    if (flashMode === FlashMode.off) {
      ref_camera.current.pausePreview();
      if (source === "new_pic") {
        navigation.push("SelectEmojiScreen");
        return;
      }
    }
  };
  
  const on_press_pick_image = async function() {
    _.delay(function() {
      if (source === "profile_image") {
        navigation.navigate("UserStack");
        return;
      }
      navigation.push("SelectEmojiScreen");
    }, 500);
    const result = await ImagePicker.launchImageLibraryAsync({quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: (source === "new_pic" ? false : true)});
    if (!result.canceled) {
      const asset = _.first(result.assets);
      
      let ops = [];
      if (source === "new_pic") {
        const output_aspect_ratio = 4/5;
        const input_aspect_ratio = asset.width / asset.height;
        let output_width = asset.width;
        let output_height = asset.height;
        if (input_aspect_ratio > output_aspect_ratio) {
            output_width = asset.height * output_aspect_ratio;
        } else if (input_aspect_ratio < output_aspect_ratio) {
            output_height = asset.width / output_aspect_ratio;
        }
        const output_x = Math.abs((output_width - asset.width) * 0.5);
        const output_y = Math.abs((output_height - asset.height) * 0.5);
        
        if (output_width < 1080 || output_height < 1350) {
          $.display_error(toast, new Error("Invalid sized image"));
          return;
        } 
        ops.push({crop: {height: output_height, width: output_width, originX: output_x, originY: output_y}}, {resize: {height: 1350, width: 1080}});
      } else {
        ops.push({resize: {height: 110, width: 110}});
      }

      $.editor.pic = await ImageManipulator.manipulateAsync(asset.uri, ops, {compress: source === "new_pic" ? 0.9 : 1});
      $.editor.uploader.reset();
      $.editor.uploader.upload(current_user.id + (source === "new_pic" ? "/images" : "/profile_images"), $.editor.pic.uri, "image");
    } else {
      source === "new_pic" && navigation.goBack();
    }
  };
  
  const on_press_existing_pic = function() {
    if (source === "profile_image") {
      navigation.goBack();
      return;
    }
    navigation.push("SelectEmojiScreen");
  };

  const camera_height = (source === "profile_image" ? width : Math.round((width/1080 * 1350)));
  
  return (
    <SafeAreaView style ={{flex: 1}}>
      <View style={{flexDirection: "row", paddingLeft: 10, paddingRight: 10}}>
        <IconButton icon="close" mode="contained" onPress={on_press_close}/>
        <View style={{flexDirection: "row", flex: 1, justifyContent: "flex-end"}}>
          <IconButton icon="image-multiple-outline" mode="contained" onPress={on_press_pick_image}/>
          <IconButton icon={flash_icon} mode="contained" onPress={on_press_flash}/>
          <IconButton icon={type_icon} mode="contained" onPress={on_press_type}/>
        </View>
      </View>
      
      <Camera
        ref={ref_camera}
        type={cameraType}
        flashMode={flashMode}
        style={{height: camera_height, marginTop: 10}}
      />
      
      <View style={{position: "absolute", left: 0, bottom: 64, width: width}}>
        <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <IconButton icon="circle" mode="contained" onPress={on_press_take_picture} size={64}/>
        </View>
      </View>
      
      {source === "new_pic" && editor_snap.pic && (
        <TouchableOpacity style={{position: "absolute", left: 10, bottom: 48, width: 64, height: 64}} onPress={on_press_existing_pic}>
          <Image source={{ uri: editor_snap.pic.uri }} style={{ width: 64, height: 64, borderWidth: 2 }} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};


export default CameraScreen;
