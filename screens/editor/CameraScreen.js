/* global fetch */
"use strict";
import $ from "../../setup.js";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { Image, View, useWindowDimensions } from 'react-native';
import TouchableOpacity  from "../../components/TouchableOpacity";
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { Appbar, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useSnapshot } from 'valtio';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from "react-native-toast-notifications";
import Uploader from "../../components/Uploader";
import * as Location from 'expo-location';

const CameraScreen = function({ navigation, route }) {
  const toast = useToast();
  let source = "new_pic";
  if (route && route.params && route.params.source === "profile_image") {
    source = route.params.source;
  }
  const editor_snap = useSnapshot($.editor);
  const snap_current_user = $.get_snap_current_user();
  const {width} = useWindowDimensions();
  const ref_camera = useRef();
  const [camera_type, set_camera_type] = useState(CameraType.back);
  const [flash_mode, setflash_mode] = useState(FlashMode.off);
  const [is_taking_pic, set_is_taking_pic] = useState(false);
  
  
  const maybe_cache_coarse_location_data = async function() {
    if ($.session.coarse_location_data) {
      return;
    }
    const { status } = await Location.getForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return;
    }

    $.session.location = await Location.getCurrentPositionAsync({});
    const cities_url = "https://api.geoapify.com/v1/geocode/reverse?format=json&type=postcode&limit=16&lat=" + $.session.location.coords.latitude + "&lon=" + $.session.location.coords.longitude + "&apiKey=" + $.config.geoapify.api_key;
    try {
      const response = await fetch(cities_url);
      const json = await response.json();
      $.session.coarse_location_data = json.results;
    } catch (e) {
      console.error(e);
    }
  };
  
  useEffect(() => {
    maybe_cache_coarse_location_data();
  }, []);

  const on_press_close = function() {
    navigation.goBack();
  };

  let flash_icon, type_icon;

  if (flash_mode === FlashMode.on) {
    flash_icon = "flash";
  } else if (flash_mode === FlashMode.off) {
    flash_icon = "flash-off";
  } else if (flash_mode === FlashMode.auto) {
    flash_icon = "flash-auto";
  }
  
  if (camera_type === CameraType.back) {
    type_icon = "camera-rear";
  } else if (camera_type.front) {
    type_icon = "camera-front";
  }
  
  const on_press_flash = function() {
    if (flash_icon === "flash-off") {
      setflash_mode(FlashMode.auto);
      flash_icon = "flash-auto";
    } else if (flash_icon === "flash") {
      setflash_mode(FlashMode.off);
      flash_icon = "flash-off";
    } else {
      setflash_mode(FlashMode.on);
      flash_icon = "flash";
    }
  };
  
  const on_press_type = async function() {
    if (type_icon === "camera-rear") {
      set_camera_type(CameraType.front);
      type_icon = "camera-front";
    } else {
      set_camera_type(CameraType.back);
      type_icon = "camera-rear";
    }
  };
  
  
  
  const on_press_take_picture = async function() {
    if (is_taking_pic) {
      return;
    }
    set_is_taking_pic(true);
    ref_camera.current.takePictureAsync({quality: 0.85, onPictureSaved: async function(pic) {
      set_is_taking_pic(false);
      let height;
      if (source === "new_pic") {
        height = 1350;
      }
      $.editor.pic = await ImageManipulator.manipulateAsync(pic.uri, [{resize: {height: height, width: source === "new_pic" ? 1080 : 110}}], {compress: source === "new_pic" ? 0.9 : 1});
      let uploader;
      if (source === "new_pic") {
        uploader =$.uploader = new Uploader(); 
      } else {
        uploader = $.profile_image_uploader;
      }
      uploader.upload(snap_current_user.id + (source === "new_pic" ? "/images" : "/profile_images"), $.editor.pic.uri, "image");
      if (flash_mode === FlashMode.off && source === "new_pic") {
        ref_camera.current.resumePreview();
      } else {
        if (source === "profile_image") {
          navigation.goBack();
          return;
        }
        navigation.push("SelectEmojiScreen"); 
      }
    }});
    if (flash_mode === FlashMode.off) {
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
    }, 1000);
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
      let uploader;
      if (source === "new_pic") {
        uploader = $.uploader = new Uploader(); 
      } else {
        uploader = $.profile_image_uploader;
      }
      uploader.upload(snap_current_user.id + (source === "new_pic" ? "/images" : "/profile_images"), $.editor.pic.uri, "image");
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
    <SafeAreaView style ={{flex: 1}} edges={["top", "right", "bottom", "left"]}>
       <Appbar.Header>
          <Appbar.BackAction onPress={on_press_close} />
          <Appbar.Content title={""}  />
          <Appbar.Action icon={"image-multiple-outline"} onPress={on_press_pick_image} />
          <Appbar.Action icon={flash_icon} onPress={on_press_flash} />
          <Appbar.Action icon={type_icon}  onPress={on_press_type} />
      </Appbar.Header>
      
      <Camera
        ref={ref_camera}
        type={camera_type}
        flash_mode={flash_mode}
        style={{height: camera_height, marginTop: 10}}
      />
      
      <View style={{position: "absolute", left: 0, bottom: 64, width: width}}>
        <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <IconButton icon="circle" mode="contained" onPress={on_press_take_picture} size={64} disabled={is_taking_pic}/>
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
