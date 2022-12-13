"use strict";
import $ from "../setup";
import { Fragment, useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View, TouchableOpacity } from 'react-native';
import { Avatar, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';

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

const Post = function({id, navigation, number_columns, is_history_screen}) {
  const [is_image_loaded, set_is_image_loaded] = useState(false);
  const {width} = useWindowDimensions();
  const { colors } = useTheme();
  
  const cache = $.cache.get_snap();
  const snap_post = cache[id];
  
  if (!snap_post) {
    return null;
  }
  
  const snap_user = cache[snap_post.uid];
  if (!snap_user || snap_post.is_deleted) { // can't check this earlier to keep hook counts the same
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
  
  const on_image_load = function() {
    set_is_image_loaded(true);
  };
  
  const on_press_post = function() {
    navigation.push("PostScreen", {id: id});
  };
  
  return (
    <View style={{width: final_width, height: final_height}}>
      <FastImage source={{uri:snap_post.image_urls["1080"].url}} style={{width: final_width, height: final_height, borderWidth: number_columns === 1 ? 1 : StyleSheet.hairlineWidth, borderColor: colors.background}} onLoad={on_image_load}/>
      <View style={{backgroundColor: "rgba(0, 0, 0, 0.2)", position: "absolute", width: final_width, height: final_height}}>
        {is_image_loaded && number_columns === 1 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_1, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
            <TouchableOpacity style={{flex: 1}} onPress={on_press_post} activeOpacity={1}/>
            <View style={{flexDirection: "row", margin: 8}}>
              <View style={{flex: 1, justifyContent: "flex-end", marginRight: 4}}>
                {!is_history_screen && (
                  <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                      <View style={[{borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 20}]}>
                        <Avatar.Image size={40} source={{uri: snap_user.profile_image_url}} />
                      </View>
                      <Text style={[styles.image_text_1_username, styles.image_text]}>{snap_user.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {true && <Text numberOfLines={3} style={[styles.image_text_1, styles.image_text, {width: "100%", marginTop: 4}]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text>}
              </View>
              <View>
                <TouchableOpacity onPress={on_press_user} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"heart"} color="white" size={32} style={[styles.image_text]}/>
                  <Text style={[styles.image_text, styles.image_text_actions_1]}>677.3K</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_user} style={{marginTop: 8, alignItems: "center"}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment"} color="white" size={32} style={[styles.image_text]}/>
                  <Text style={[styles.image_text, styles.image_text_actions_1]}>23.1K</Text>
                </TouchableOpacity>
              </View>
              
            </View>
          </Fragment>
        )}
        {is_image_loaded && number_columns === 2 && (
          <Fragment>
            <View style={{marginLeft: 7, marginTop: 7}}>
              <LiveTimeAgo style={[styles.image_text_2, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
            <TouchableOpacity style={{flex: 1}} onPress={on_press_post} activeOpacity={1}/>
            {!is_history_screen && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 7}}>
                <View style={{flexDirection: "row", alignItems: "center"}}>
                  <View elevation={5} style={[{borderWidth: 1, borderColor: "white", marginRight: 3, borderRadius: 15}]}>
                    <Avatar.Image size={30} source={{uri: snap_user.profile_image_url}} />
                  </View>
                  <Text style={[styles.image_text_2, styles.image_text]}>{snap_user.username}</Text>
                </View>
              </TouchableOpacity>
            )}
          </Fragment>
        )}
        {is_image_loaded && number_columns === 3 && (
          <Fragment>
            <View style={{marginLeft: 6, marginTop: 6}}>
              <LiveTimeAgo style={[styles.image_text_3, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
            <TouchableOpacity style={{flex: 1}} onPress={on_press_post} activeOpacity={1}/>
            {!is_history_screen && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5}}>
                <Text style={[styles.image_text_3, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
          </Fragment>
        )}
        {is_image_loaded && number_columns === 4 && (
          <Fragment>
            <View style={{marginLeft: 5, marginTop: 5}}>
              <LiveTimeAgo style={[styles.image_text_4, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
            <TouchableOpacity style={{flex: 1}} onPress={on_press_post} activeOpacity={1}/>
            {!is_history_screen && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5}}>
                <Text style={[styles.image_text_4, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
          </Fragment>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  image_text: {
    color: "white"
  },
  image_text_4: {
    fontSize: 9
  },
  image_text_3: {
    fontSize: 11
  },
  image_text_2: {
    fontSize: 13
  },
  image_text_1: {
    fontSize: 14
  },
  image_text_1_username: {
    fontSize: 15
  },
  image_text_actions_1: {
    fontSize: 10
  }
});

export default Post;