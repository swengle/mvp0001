"use strict";
import $ from "../setup";
import { Fragment, useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import SwengleImage from "./SwengleImage";
import { Avatar, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';


const LiveTimeAgo = function({ date, variant, style }) {
  const [time, set_time] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => set_time(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <Text variant="labelSmall" style={[style, styles.shadow_text]}>{$.timeago.format(date)}</Text>;
};

const Post = function({id, navigation, number_columns}) {
  const {width} = useWindowDimensions();
  const { colors } = useTheme();
  const snap_post = $.cache.get_snap(id);
  if (!snap_post) {
    return null;
  }
  
  const snap_user = $.cache.get_snap(snap_post.uid);
  if (!snap_user) {
    return null;
  }
  
  const on_press_user = function() {
    navigation.push("UserScreen", { uid: snap_post.uid });
  };
  
  let final_width = width;
  if (number_columns === 2) {
    final_width = width/2;
  } else if (number_columns === 3) {
    final_width = width/3;
  } else if (number_columns === 4) {
    final_width = width/4;
  }
  
  let final_height = final_width * (snap_post.image_urls["1080"].height/snap_post.image_urls["1080"].width);
  
  return (
    <View style={{width: final_width, height: final_height}}>
      <SwengleImage source={{uri:snap_post.image_urls["1080"].url}} style={{width: final_width, height: final_height, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.background}}/>
      {number_columns === 1 && (
        <Fragment>
          <View style={{position: "absolute", left: 10, top: 10}}>
            <LiveTimeAgo variant="labelSmall" date={snap_post.created_at.toDate()}/>
          </View>
          <View style={{position: "absolute", left: 10, bottom: 10}}>
            <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <View elevation={5} style={[styles.shadow, {borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 20}]}>
                  <Avatar.Image size={40} source={{uri: snap_user.profile_image_url}} />
                </View>
                <Text variant="titleMedium" style={styles.shadow_text}>{snap_user.username}</Text>
              </View>
            </TouchableOpacity>
            {snap_post.caption && <Text variant="labelMedium" numberOfLines={3} style={[{marginRight: 64, marginTop: 4}, styles.shadow_text]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text>}
          </View>
          <View style={{position: "absolute", right: 10, bottom: 10}}>
              <TouchableOpacity onPress={on_press_user} style={{alignItems: "center"}} activeOpacity={0.8}>
                <MaterialCommunityIcons name={"heart"} color="white" size={32} style={[styles.shadow_text]}/>
                <Text variant="labelSmall" style={styles.shadow_text}>677.3K</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={on_press_user} style={{marginTop: 8, alignItems: "center"}} activeOpacity={0.8}>
                <MaterialCommunityIcons name={"comment"} color="white" size={32} style={[styles.shadow_text]}/>
                <Text variant="labelSmall" style={styles.shadow_text}>23.1K</Text>
              </TouchableOpacity>
          </View>
        </Fragment>
      )}
      {number_columns === 2 && (
        <Fragment>
           <View style={{position: "absolute", left: 7, top: 7}}>
            <LiveTimeAgo variant="labelSmall" date={snap_post.created_at.toDate()}/>
          </View>
          <View style={{position: "absolute", left: 7, bottom: 7}}>
            <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <View elevation={5} style={[styles.shadow, {borderWidth: 1, borderColor: "white", marginRight: 3, borderRadius: 10}]}>
                  <Avatar.Image size={20} source={{uri: snap_user.profile_image_url}} />
                </View>
                <Text variant="labelMedium" style={styles.shadow_text}>{snap_user.username}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Fragment>
      )}
      {(number_columns === 3) && (
        <Fragment>
          <View style={{position: "absolute", left: 5, top: 5}}>
            <LiveTimeAgo variant="labelSmall" date={snap_post.created_at.toDate()}/>
          </View>
          <View style={{position: "absolute", left: 5, bottom: 5}}>
            <TouchableOpacity onPress={on_press_user} style={{flexDirection: "row", alignItems: "center"}} activeOpacity={0.8}>
              <View style={{flexDirection: "row", alignItems: "center"}}>
                <View elevation={5} style={[styles.shadow, {borderWidth: 1, borderColor: "white", marginRight: 2, borderRadius: 10}]}>
                  <Avatar.Image size={20} source={{uri: snap_user.profile_image_url}} />
                </View>
              </View>
              <Text variant="labelSmall" style={styles.shadow_text}>{snap_user.username}</Text>
            </TouchableOpacity>
          </View>
        </Fragment>
      )}
      {(number_columns === 4) && (
        <Fragment>
           <View style={{position: "absolute", left: 3, bottom: 3}}>
            <LiveTimeAgo variant="labelSmall" style={{fontSize: 10}} date={snap_post.created_at.toDate()}/>
          </View>
        </Fragment>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shadow_text: {
    color: "white", 
    textShadowColor: 'rgba(0, 0, 0, 0.8)', 
    textShadowOffset: {width: -1, height: 1}, 
    textShadowRadius: 1
  },
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.8,
    shadowRadius: 1,
    shadowOffset: {
      width: -1,
      height: 1
    }
  }
});

export default Post;