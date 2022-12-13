"use strict";
import $ from "../../setup";
import { Fragment, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Appbar, Avatar, Menu, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import { useToast } from "react-native-toast-notifications";

const LiveTimeAgo = function({ date, style }) {
  const [time, set_time] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => set_time(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <Text style={style}>{$.timeago.format(date)}</Text>;
};

const PostScreen = function({ navigation, route }) {
  const [is_more_menu_visible, set_is_more_menu_visible] = useState(false);
  const {width} = useWindowDimensions();
  const toast = useToast();
  const { colors } = useTheme();
  let id;
  if (route && route.params && route.params.id) {
    id = route.params.id;
  }

  const cache = $.cache.get_snap();
  const snap_post = cache[id];
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  let final_width, final_height;
  if (snap_post && !snap_post.is_deleted) {
    final_width = width;
    final_height = final_width * (snap_post.image_urls["1080"].height/snap_post.image_urls["1080"].width);
  }
  
  const on_dismiss_more_menu = function() {
    set_is_more_menu_visible(false);
  };
  
  const on_press_more = function() {
    set_is_more_menu_visible(true);
  };
  
  const on_press_delete = async function() {
    set_is_more_menu_visible(false);
    try {
      await firestore.delete_post({
        id: id
      });
    } catch (e) {
      console.log(e);
      $.display_error(toast, new Error("Failed to delete post."));
    }
  };

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="Post" />
        {(snap_post && !snap_post.is_deleted) && (
          <Menu
            visible={is_more_menu_visible}
            onDismiss={on_dismiss_more_menu}
            anchor={<Appbar.Action icon="dots-vertical" onPress={on_press_more} />}>
            <Menu.Item leadingIcon="delete" onPress={on_press_delete} title="Delete" />
          </Menu>
        )}
      </Appbar.Header>
      {(!snap_post || snap_post.is_deleted) && (
        <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <Text variant="titleSmall">POST NOT FOUND</Text>
        </View>
      )}
      {(snap_post && !snap_post.is_deleted) && (
        <FastImage source={{uri:snap_post.image_urls["1080"].url}} style={{width: final_width, height: final_height, borderWidth: 1, borderColor: colors.background}}/>
      )}
    </SafeAreaView>
  );
};


export default PostScreen;
