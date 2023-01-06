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
import useCachedData from "../hooks/useCachedData";
import EmojiOverlay from "../components/EmojiOverlay";

const UserPost = function({id, navigation, number_columns, screen, on_press_comment, on_press_comments, on_press_like, on_press_likes}) {
  const anim = useRef(new Animated.Value(1));
  const [is_image_loaded, set_is_image_loaded] = useState(false);
  const { colors } = useTheme();

  const user = useCachedData.cache_get(id);
  const snap_user = useCachedData.cache_get_snap(id); // this needs to be here so hook counts stay balanced
  
  if (!user || !user.current_post) {
    return null;
  }

  const on_press_user = function() {
    navigation.push("UserScreen", { id: snap_user.id });
  };
  
  const on_image_load = function() {
    set_is_image_loaded(true);
  };
  
  const on_press_post = function() {
    navigation.push("UserScreen", {id: snap_user.id});
  };
  
  const on_press_like_inner = async function() {
    _.isFunction(on_press_like) && on_press_like();
    if (!user.current_post.is_liked) {
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
      _.isNumber(user.current_post.like_count) ? user.current_post.like_count++ : user.current_post.like_count = 1;
      user.current_post.is_liked = true;
      try {
        await firestore.create_like(user.id, user.current_post.id, "post");
      } catch (e) {
        $.logger.error(e);
        user.current_post.like_count--;
        user.current_post.is_liked = false;
      }
    } else {
      _.isNumber(user.current_post.like_count) ? user.current_post.like_count-- : user.current_post.like_count = 0;
      user.current_post.is_liked = false;
      try {
        await firestore.delete_like(user.current_post.id);
      } catch (e) {
        $.logger.error(e);
        user.current_post.like_count++;
        user.current_post.is_liked = true;
      }
    }
  };
  
  const on_press_comment_inner = function() {
    _.isFunction(on_press_comment) && on_press_comment();
    if (screen !== "UserScreen" && screen !== "PostScreen") {
      navigation.push("UserScreen", {id: snap_user.id, is_auto_focus: true, is_scroll_to_comments: true}); 
    }
  };
  
  const on_press_comments_inner = function() {
    _.isFunction(on_press_comments) && on_press_comments();
    if (screen !== "UserScreen" && screen !== "PostScreen") {
      navigation.push("UserScreen", {id: snap_user.id, is_scroll_to_comments: true});
    }
  };
  
  const on_press_likes_inner = function() {
     _.isFunction(on_press_likes) && on_press_likes();
    navigation.push("UserListScreen", {screen: "LikersScreen", id: user.current_post.id});
  };
  
  const on_press_emoji = function(emoji) {
    navigation.push("UserPostListScreen", {screen: "EmojiScreen", emoji: emoji});
  };
  
  const on_press_location = function() {
    navigation.push("UserPostListScreen", {screen: "LocationScreen", id: user.current_post.location.id, title: user.current_post.location.name});
  };
  
  const like_count = _.isNumber(snap_user.current_post.like_count) ? snap_user.current_post.like_count : 0;
  const comment_count = _.isNumber(snap_user.current_post.comment_count) ? snap_user.current_post.comment_count : 0;

  if (screen === "UserScreen" || screen === "PostScreen") {
    return (
      <Fragment>
        <View style={{flexDirection: "row", padding: 10, paddingTop: 0}}>
          <View style={{flex:1}}>
            {snap_user.current_post.location && <TouchableOpacity style={{flexDirection: "row"}} onPress={on_press_location}><MaterialCommunityIcons name={"map-marker"} size={16} color={colors.text}/><Text numberOfLines={1} style={{fontSize: 12}}>{snap_user.current_post.location.name}</Text></TouchableOpacity>}
          </View>
          <LiveTimeAgo style={{fontSize: 12}} date={snap_user.current_post.created_at.toDate()}/>
        </View>

        {snap_user.current_post.caption && (
          <Text style={{margin: 10, marginTop: 0}}>
            {snap_user.current_post.caption}
          </Text>
        )}
        <View>
          <TapDetector on_double_tap={on_press_like_inner}>
            <View>
              <FastImage source={{uri: snap_user.current_post.image_urls["1080"].url}} style={{width: $.const.image_sizes[1].width, height: $.const.image_sizes[1].height, borderWidth: 1, borderColor: colors.background}}/>
            </View>
          </TapDetector>
          {_.isString(snap_user.current_post.emoji_char) && <EmojiOverlay emoji_char={snap_user.current_post.emoji_char} scaling_factor={1}  on_press={on_press_emoji}/>}
        </View>
        <View style={{flexDirection: "row", alignItems: "center", marginVertical: 4}}>
          <TouchableOpacity onPress={on_press_like_inner} style={{alignItems: "center", marginLeft: 10}} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ scale: anim.current }] }}>
              <Text><MaterialCommunityIcons name={snap_user.current_post.is_liked ? "heart" : "heart-outline"} size={32} style={snap_user.current_post.is_liked ? {color: "red"} : {color: colors.outline}}/></Text>
            </Animated.View>
          </TouchableOpacity>
          {like_count > 0 && (
            <TouchableOpacity style={{flexDirection: "row", alignItems: "center", padding: 10, width: 64}} onPress={on_press_likes_inner}>
              <Text variant="titleSmall">{like_count} </Text>
              {like_count === 1 ? <Text>like</Text> : <Text>likes</Text>}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginLeft: 20}} activeOpacity={0.8}>
            <Text><MaterialCommunityIcons name={"comment-outline"} size={32} color={colors.outline}/></Text>
          </TouchableOpacity>
          {comment_count > 0 && (
            <TouchableOpacity style={{flexDirection: "row", alignItems: "center", padding: 10}} onPress={on_press_comments_inner}>
              <Text variant="titleSmall">{comment_count} </Text>
              {comment_count === 1 ? <Text>comment</Text> : <Text>comments</Text>}
            </TouchableOpacity>
          )}
        </View>
      </Fragment
      >
    );
  }

  return (
    <View>
      <FastImage source={{uri:snap_user.current_post.image_urls["1080"].url}} style={{width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height, borderWidth: (number_columns === 2 || number_columns === 3) ? 1 : number_columns === 4 ? StyleSheet.hairlineWidth : null, borderColor: colors.background}} onLoad={on_image_load}/>
      <View pointerEvents="box-none" style={{backgroundColor: "rgba(0, 0, 0, 0.2)", position: "absolute", width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height}}>
        {(is_image_loaded) && number_columns === 1 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_1, styles.image_text]} date={snap_user.current_post.created_at.toDate()}/>
              {snap_user.current_post.location && <TouchableOpacity onPress={on_press_location}><Text numberOfLines={1} style={[{width: "65%"}, styles.image_text_place_1, styles.image_text]}>{snap_user.current_post.location.name}</Text></TouchableOpacity>}
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
                {snap_user.current_post.caption && <Text numberOfLines={3} style={[styles.image_text_1, styles.image_text, {width: "100%", marginTop: 4}]}>{snap_user.current_post.caption}</Text>}
              </View>
              <View>
                <TouchableOpacity onPress={on_press_like_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={snap_user.current_post.is_liked ? "heart" : "heart-outline"} size={32} style={[styles.image_text, snap_user.current_post.is_liked ? {color: "red"} : null]}/>
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_likes_inner} style={{alignItems: "center", marginTop: 0}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_user.current_post.like_count > 0 ? 1: 0}]}>{snap_user.current_post.like_count > 0 ? snap_user.current_post.like_count : ""}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginTop: 4}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={32} style={[styles.image_text]}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments_inner} style={{marginTop: 4, alignItems: "center"}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_user.current_post.comment_count > 0 ? 1: 0}]}>{snap_user.current_post.comment_count > 0 ? snap_user.current_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {is_image_loaded && _.isString(snap_user.current_post.emoji_char) && <EmojiOverlay  emoji_char={snap_user.current_post.emoji_char} scaling_factor={number_columns}  on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 2 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_2, styles.image_text]} date={snap_user.current_post.created_at.toDate()}/>
              {snap_user.current_post.location && <TouchableOpacity onPress={on_press_location}><Text style={[{width: "65%"}, styles.image_text_2, styles.image_text]} numberOfLines={1}>{snap_user.current_post.location.name}</Text></TouchableOpacity>}
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
                {snap_user.current_post.caption && <Text numberOfLines={1} style={[styles.image_text_2, styles.image_text, {width: "100%", marginTop: 4}]}>{snap_user.current_post.caption}</Text>}
              </View>
              <View style={{right: -4}}>
                <TouchableOpacity onPress={on_press_like_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={snap_user.current_post.is_liked ? "heart" : "heart-outline"} size={20} style={[styles.image_text, snap_user.current_post.is_liked ? {color: "red"} : null]}/>
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_likes_inner} style={{alignItems: "center", paddingLeft: 4, paddingRight: 4}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_user.current_post.like_count > 0 ? 1: 0}]}>{snap_user.current_post.like_count > 0 ? snap_user.current_post.like_count : "0"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginTop: 4, paddingLeft: 4, paddingRight: 4}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={20} style={[styles.image_text]}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments_inner} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_user.current_post.comment_count > 0 ? 1: 0}]}>{snap_user.current_post.comment_count > 0 ? snap_user.current_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {is_image_loaded && _.isString(snap_user.current_post.emoji_char) && <EmojiOverlay  emoji_char={snap_user.current_post.emoji_char} scaling_factor={number_columns} on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 3 && (
          <Fragment>
            <View style={{marginLeft: 6, marginTop: 6, flexDirection: "row"}}>
              <LiveTimeAgo style={[styles.image_text_3, styles.image_text]} date={snap_user.current_post.created_at.toDate()}/>
              {snap_user.current_post.location && <TouchableOpacity onPress={on_press_location}><MaterialCommunityIcons name={"map-marker"} size={16} color={colors.text}/></TouchableOpacity>}
            </View>
            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>
            {(screen !== "HistoryScreen") && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5, paddingBottom: 0}}>
                <Text style={[styles.image_text_3_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {snap_user.current_post.caption && <View style={{padding: 4}}><Text numberOfLines={1} style={[styles.image_text_3, styles.image_text, {width: "100%"}]}>{snap_user.current_post.caption}</Text></View>}
            {is_image_loaded && _.isString(snap_user.current_post.emoji_char) && <EmojiOverlay  emoji_char={snap_user.current_post.emoji_char} scaling_factor={number_columns}  on_press={on_press_emoji}/>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 4 && (
          <Fragment>
            <View style={{marginLeft: 5, marginTop: 5, flexDirection: "row"}}>
              <LiveTimeAgo style={[styles.image_text_4, styles.image_text]} date={snap_user.current_post.created_at.toDate()}/>
              {snap_user.current_post.location && <TouchableOpacity onPress={on_press_location}><MaterialCommunityIcons name={"map-marker"} size={16} color={colors.text}/></TouchableOpacity>}
            </View>
             <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like_inner}><View style={{flex:1}}/></TapDetector>
            {(screen !== "HistoryScreen") && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 4}}>
                <Text style={[styles.image_text_4_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {is_image_loaded && _.isString(snap_user.current_post.emoji_char) && <EmojiOverlay  emoji_char={snap_user.current_post.emoji_char} scaling_factor={number_columns} on_press={on_press_emoji}/>}
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

export default UserPost;