"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment, useRef, useState } from "react";
import { Animated, StyleSheet, View } from 'react-native';
import { Avatar, Divider, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';
import firestore from "../firestore/firestore";
import TouchableOpacity  from "../components/TouchableOpacity";
import TapDetector from "../components/TapDetector";
import LiveTimeAgo from "../components/LiveTimeAgo";
import useGlobalCache from "../hooks/useGlobalCache";
import EmojiOverlay from "../components/EmojiOverlay";

const Post = function({id, navigation, number_columns, screen, on_press_comment, on_press_comments, on_press_like, on_press_likes}) {
  const anim = useRef(new Animated.Value(1));
  const [is_image_loaded, set_is_image_loaded] = useState(false);
  const { colors } = useTheme();
  const { cache_get, cache_get_snapshot } = useGlobalCache();

  const post = cache_get(id);
  const snap_post = cache_get_snapshot(id);

  const user = post ? cache_get(post.uid) : undefined;
  const snap_user = post ? cache_get_snapshot(post.uid) : undefined;
  
  if (!post || !user) {
    return null;
  }

  const on_press_user = function() {
    navigation.push("PostListScreen", { screen: "UserScreen", id: user.id });
  };
  
  const on_image_load = function() {
    set_is_image_loaded(true);
  };
  
  const on_press_post = function() {
    navigation.push("PostScreen", {id: id});
  };
  
  const on_press_like_inner = async function() {
    _.isFunction(on_press_like) && on_press_like();
    if (!post.is_liked) {
      Animated.sequence([
        // increase size
        Animated.timing(anim.current, {
          toValue: 1.75, 
          duration: 250,
          useNativeDriver: true
        }, ),
        // decrease size
        Animated.timing(anim.current, {
          toValue: 1, 
          duration: 250,
          useNativeDriver: true
        }),
        
      ]).start();
      _.isNumber(post.like_count) ? post.like_count++ : post.like_count = 1;
      post.is_liked = true;
      try {
        await firestore.create_like(post.uid, post.id, "post");
      } catch (e) {
        $.logger.error(e);
        post.like_count--;
        post.is_liked = false;
      }
    } else {
      _.isNumber(post.like_count) ? post.like_count-- : post.like_count = 0;
      post.is_liked = false;
      try {
        await firestore.delete_like(post.id);
      } catch (e) {
        $.logger.error(e);
        post.like_count++;
        post.is_liked = true;
      }
    }
  };
  
  const on_press_comment_inner = function() {
    _.isFunction(on_press_comment) && on_press_comment();
    if (screen !== "UserScreen" && screen !== "PostScreen") {
      navigation.push("UserScreen", {id: user.id, is_auto_focus: true, is_scroll_to_comments: true}); 
    }
  };
  
  const on_press_comments_inner = function() {
    _.isFunction(on_press_comments) && on_press_comments();
    if (screen !== "UserScreen" && screen !== "PostScreen") {
      navigation.push("UserScreen", {id: user.id, is_scroll_to_comments: true});
    }
  };
  
  const on_press_likes_inner = function() {
     _.isFunction(on_press_likes) && on_press_likes();
    navigation.push("UserListScreen", {screen: "LikersScreen", id: post.id});
  };
  
  const on_press_emoji = function(emoji) {
    navigation.push("PostListScreen", {screen: "EmojiScreen", emoji: emoji});
  };
  
  const on_press_location = function() {
    navigation.push("PostListScreen", {screen: "LocationScreen", id: post.location.id, title: post.location.name});
  };

  return (
    <View>
      <FastImage source={{uri:snap_post.image_url}} style={{width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height, borderWidth: (number_columns === 2 || number_columns === 3) ? 1 : number_columns === 4 ? StyleSheet.hairlineWidth : null, borderColor: colors.background}} onLoad={on_image_load}/>
      <View pointerEvents="box-none" style={{backgroundColor: "rgba(0, 0, 0, 0.2)", position: "absolute", width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height}}>
        {(is_image_loaded) && number_columns === 1 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_1, styles.image_text]} date={snap_post.created_at.toDate()}/>
              {snap_post.location && <TouchableOpacity onPress={on_press_location}><Text numberOfLines={1} style={[{width: "65%"}, styles.image_text_place_1, styles.image_text]}>{snap_post.location.name}</Text></TouchableOpacity>}
            </View>
            
            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>

            <View style={{flexDirection: "row", margin: 8}}>
              <View style={{flex: 1, justifyContent: "flex-end", marginRight: 4}}>
                {(screen !== "HistoryScreen") && (
                  <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                      <View style={[{borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 25}]}>
                        <Avatar.Image size={50} source={{uri: snap_user.profile_image_url}} />
                      </View>
                      <Text style={[styles.image_text_1_username, styles.image_text]}>{snap_user.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {snap_post.caption && <Text numberOfLines={3} style={[styles.image_text_1, styles.image_text, {width: "100%", marginTop: 4}]}>{snap_post.caption}</Text>}
              </View>
              <View>
                <TouchableOpacity onPress={on_press_like_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={snap_post.is_liked ? "heart" : "heart-outline"} size={32} style={[styles.image_text, snap_post.is_liked ? {color: "red"} : null]}/>
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_likes_inner} style={{alignItems: "center", marginTop: 0}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_post.like_count > 0 ? 1: 0}]}>{snap_post.like_count > 0 ? snap_post.like_count : ""}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginTop: 4}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={32} style={[styles.image_text]}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments_inner} style={{marginTop: 4, alignItems: "center"}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_post.comment_count > 0 ? 1: 0}]}>{snap_post.comment_count > 0 ? snap_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {is_image_loaded && _.isString(snap_post.emoji_char) && <EmojiOverlay  emoji_char={snap_post.emoji_char} scaling_factor={number_columns}  on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 2 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_2, styles.image_text]} date={snap_post.created_at.toDate()}/>
              {snap_post.location && <TouchableOpacity onPress={on_press_location}><Text style={[{width: "65%"}, styles.image_text_2, styles.image_text]} numberOfLines={1}>{snap_post.location.name}</Text></TouchableOpacity>}
            </View>
            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>
            <View style={{flexDirection: "row", margin: 8}}>
              <View style={{flex: 1, justifyContent: "flex-end", marginRight: 4}}>
                {(screen !== "HistoryScreen") && (
                  <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                      <View style={[{borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 15}]}>
                        <Avatar.Image size={30} source={{uri: snap_user.profile_image_url}} />
                      </View>
                      <Text style={[styles.image_text_2_username, styles.image_text]}>{snap_user.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {snap_post.caption && <Text numberOfLines={1} style={[styles.image_text_2, styles.image_text, {width: "100%", marginTop: 4}]}>{snap_post.caption}</Text>}
              </View>
              <View style={{right: -4}}>
                <TouchableOpacity onPress={on_press_like_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={snap_post.is_liked ? "heart" : "heart-outline"} size={20} style={[styles.image_text, snap_post.is_liked ? {color: "red"} : null]}/>
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_likes_inner} style={{alignItems: "center", paddingLeft: 4, paddingRight: 4}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_post.like_count > 0 ? 1: 0}]}>{snap_post.like_count > 0 ? snap_post.like_count : "0"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginTop: 4, paddingLeft: 4, paddingRight: 4}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={20} style={[styles.image_text]}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_post.comment_count > 0 ? 1: 0}]}>{snap_post.comment_count > 0 ? snap_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {is_image_loaded && _.isString(snap_post.emoji_char) && <EmojiOverlay  emoji_char={snap_post.emoji_char} scaling_factor={number_columns} on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 3 && (
          <Fragment>
            <View style={{marginLeft: 6, marginTop: 6, flexDirection: "row"}}>
              <LiveTimeAgo style={[styles.image_text_3, styles.image_text]} date={snap_post.created_at.toDate()}/>
              {snap_post.location && <TouchableOpacity onPress={on_press_location}><MaterialCommunityIcons name={"map-marker"} size={16} color={colors.text}/></TouchableOpacity>}
            </View>
            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>
            {(screen !== "HistoryScreen") && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5, paddingBottom: 0}}>
                <Text style={[styles.image_text_3_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {snap_post.caption && <View style={{padding: 4}}><Text numberOfLines={1} style={[styles.image_text_3, styles.image_text, {width: "100%"}]}>{snap_post.caption}</Text></View>}
            {is_image_loaded && _.isString(snap_post.emoji_char) && <EmojiOverlay  emoji_char={snap_post.emoji_char} scaling_factor={number_columns}  on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 4 && (
          <Fragment>
            <View style={{marginLeft: 5, marginTop: 5, flexDirection: "row"}}>
              <LiveTimeAgo style={[styles.image_text_4, styles.image_text]} date={snap_post.created_at.toDate()}/>
              {snap_post.location && <TouchableOpacity onPress={on_press_location}><MaterialCommunityIcons name={"map-marker"} size={16} color={colors.text}/></TouchableOpacity>}
            </View>
             <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>
            {(screen !== "HistoryScreen") && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 4}}>
                <Text style={[styles.image_text_4_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {is_image_loaded && _.isString(snap_post.emoji_char) && <EmojiOverlay  emoji_char={snap_post.emoji_char} scaling_factor={number_columns} on_press={on_press_emoji}/>}
          </Fragment>
        )}
      </View>
      { number_columns === 1 && (
        <Divider style={{marginVertical: 2}}/>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image_text: {
    color: "white",
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: {width: -2, height: 2},
    textShadowRadius: 1
  },
  image_text_4: {
    fontSize: 8
  },
  image_text_3: {
    fontSize: 9
  },
  image_text_2: {
    fontSize: 11
  },
  image_text_1: {
    fontSize: 14
  },
  image_text_1_username: {
    fontSize: 16,
    fontWeight: "500"
  },
  image_text_2_username: {
    fontSize: 13,
    fontWeight: "500"
  },
  image_text_3_username: {
    fontSize: 10,
    fontWeight: "500"
  },
  image_text_4_username: {
    fontSize: 9,
    fontWeight: "500"
  },
  image_text_actions_1: {
    fontSize: 14,
    fontWeight: "500"
  },
  image_text_actions_2: {
    fontSize: 11,
    fontWeight: "500"
  },
  image_text_place_1: {
    fontSize: 14
  }
});

export default Post;