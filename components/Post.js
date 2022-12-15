"use strict";
import $ from "../setup";
import { Fragment, useRef, useState } from "react";
import { Animated, StyleSheet, View } from 'react-native';
import { Avatar, Divider, Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';
import firestore from "../firestore/firestore";
import { TouchableOpacity } from "react-native-gesture-handler";
import TapDetector from "../components/TapDetector";
import LiveTimeAgo from "../components/LiveTimeAgo";
import useCachedData from "../hooks/useCachedData";

const Post = function({id, navigation, number_columns, is_history_screen}) {
  const anim = useRef(new Animated.Value(1));
  const [is_image_loaded, set_is_image_loaded] = useState(false);
  const [is_liking, set_is_liking] = useState(false);
  const [is_unliking, set_is_unliking] = useState(false);
  const { colors } = useTheme();
  
  const { cache_get_snap } = useCachedData();
  const snap_post = cache_get_snap(id);
  
  if (!snap_post) {
    return null;
  }
  
  const snap_user = cache_get_snap(snap_post.uid);
  if (!snap_user || snap_post.is_deleted) { // can't check this earlier to keep hook counts the same
    return null;
  }
  
  const on_press_user = function() {
    navigation.push("UserScreen", { uid: snap_post.uid });
  };
  
  const on_image_load = function() {
    set_is_image_loaded(true);
  };
  
  const on_press_post = function() {
    navigation.push("PostScreen", {id: id});
  };
  
  const on_press_like = async function() {
    if (!snap_post.is_liked) {
      Animated.sequence([
        // increase size
        Animated.timing(anim.current, {
          toValue: 1.6, 
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
        
      set_is_liking(true);
      try {
        await firestore.like_post({
          id: id
        }); 
      } catch (e) {
        console.log(e);
      } finally {
        set_is_liking(false);
      }
    } else {
      set_is_unliking(true);
      try {
        await firestore.unlike_post({
          id: id
        }); 
      } catch (e) {
        console.log(e);
      } finally {
        set_is_unliking(false);
      }
    }
  };
  
  const on_press_comments = function() {
    navigation.push("PostScreen", {id: id, is_auto_focus: true});
  };

  return (
    <View>
      <FastImage source={{uri:snap_post.image_urls["1080"].url}} style={{width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height, borderWidth: (number_columns === 2 || number_columns === 3) ? 1 : number_columns === 4 ? StyleSheet.hairlineWidth : null, borderColor: colors.background}} onLoad={on_image_load}/>
      <View style={{backgroundColor: "rgba(0, 0, 0, 0.2)", position: "absolute", width: $.const.image_sizes[number_columns].width, height: $.const.image_sizes[number_columns].height}}>
        {(is_image_loaded) && number_columns === 1 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_1, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>

            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like}><View style={{flex:1}}/></TapDetector>

            <View style={{flexDirection: "row", margin: 8}}>
              <View style={{flex: 1, justifyContent: "flex-end", marginRight: 4}}>
                {!is_history_screen && (
                  <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                      <View style={[{borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 25}]}>
                        <Avatar.Image size={50} source={{uri: snap_user.profile_image_url}} />
                      </View>
                      <Text style={[styles.image_text_1_username, styles.image_text]}>{snap_user.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {true && <Text numberOfLines={3} style={[styles.image_text_1, styles.image_text, {width: "100%", marginTop: 4}]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text>}
              </View>
              <View>
                <TouchableOpacity onPress={on_press_like} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={((is_liking || snap_post.is_liked) && !is_unliking) ? "heart" : "heart-outline"} size={32} style={[styles.image_text, ((is_liking || snap_post.is_liked) && !is_unliking) ? {color: "red"} : null]}/>
                  </Animated.View>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_post.like_count > 0 ? 1: 0}]}>{snap_post.like_count > 0 ? snap_post.like_count : ""}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments} style={{marginTop: 8, alignItems: "center"}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={32} style={[styles.image_text]}/>
                  <Text style={[styles.image_text, styles.image_text_actions_1, {opacity: snap_post.comment_count > 0 ? 1: 0}]}>{snap_post.comment_count > 0 ? snap_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 2 && (
          <Fragment>
            <View style={{marginLeft: 10, marginTop: 10}}>
              <LiveTimeAgo style={[styles.image_text_2, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>

            <TapDetector on_single_tap={on_press_post} on_double_tap={on_press_like}><View style={{flex:1}}/></TapDetector>

            <View style={{flexDirection: "row", margin: 8}}>
              <View style={{flex: 1, justifyContent: "flex-end", marginRight: 4}}>
                {!is_history_screen && (
                  <TouchableOpacity onPress={on_press_user} activeOpacity={0.8}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                      <View style={[{borderWidth: 1, borderColor: "white", marginRight: 4, borderRadius: 15}]}>
                        <Avatar.Image size={30} source={{uri: snap_user.profile_image_url}} />
                      </View>
                      <Text style={[styles.image_text_2_username, styles.image_text]}>{snap_user.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {true && <Text numberOfLines={1} style={[styles.image_text_2, styles.image_text, {width: "100%", marginTop: 4}]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text>}
              </View>
              <View>
                <TouchableOpacity onPress={on_press_like} style={{alignItems: "center"}} activeOpacity={0.8}>
                  <Animated.View style={{ transform: [{ scale: anim.current }] }}>
                    <MaterialCommunityIcons name={((is_liking || snap_post.is_liked) && !is_unliking) ? "heart" : "heart-outline"} size={20} style={[styles.image_text, ((is_liking || snap_post.is_liked) && !is_unliking) ? {color: "red"} : null]}/>
                  </Animated.View>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_post.like_count > 0 ? 1: 0}]}>{snap_post.like_count > 0 ? snap_post.like_count : "0"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={on_press_comments} style={{marginTop: 8, alignItems: "center"}} activeOpacity={0.8}>
                  <MaterialCommunityIcons name={"comment-outline"} size={20} style={[styles.image_text]}/>
                  <Text style={[styles.image_text, styles.image_text_actions_2, {opacity: snap_post.comment_count > 0 ? 1: 0}]}>{snap_post.comment_count > 0 ? snap_post.comment_count : ""}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 3 && (
          <Fragment>
            <View style={{marginLeft: 6, marginTop: 6}}>
              <LiveTimeAgo style={[styles.image_text_3, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
            <TapDetector on_single_tap={on_press_post}><View style={{flex:1}}/></TapDetector>
            {!is_history_screen && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5, paddingBottom: 0}}>
                <Text style={[styles.image_text_3_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {true && <View style={{padding: 4}}><Text numberOfLines={1} style={[styles.image_text_3, styles.image_text, {width: "100%"}]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text></View>}
          </Fragment>
        )}
        {(is_image_loaded) && number_columns === 4 && (
          <Fragment>
            <View style={{marginLeft: 5, marginTop: 5}}>
              <LiveTimeAgo style={[styles.image_text_4, styles.image_text]} date={snap_post.created_at.toDate()}/>
            </View>
           <TapDetector on_single_tap={on_press_post}><View style={{flex:1}}/></TapDetector>
            {!is_history_screen && (
              <TouchableOpacity onPress={on_press_user} activeOpacity={0.8} style={{padding: 5, paddingBottom: 0}}>
                <Text style={[styles.image_text_4_username, styles.image_text]}>{snap_user.username}</Text>
              </TouchableOpacity>
            )}
            {true && <View style={{padding: 4}}><Text numberOfLines={1} style={[styles.image_text_4, styles.image_text, {width: "100%"}]}>This is some text to go with this thing! This is some text to go with this thing! This is some text to go</Text></View>}
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
    color: "white"
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
    fontSize: 12
  },
  image_text_actions_2: {
    fontSize: 9
  }
});

export default Post;