"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment, useRef, useState } from "react";
import { Animated, View } from 'react-native';
import { Avatar, HelperText, Text, Surface, useTheme } from "react-native-paper";
import useCachedData from "../hooks/useCachedData";
import firestore from "../firestore/firestore";
import TouchableOpacity  from "../components/TouchableOpacity";
import LiveTimeAgo from "../components/LiveTimeAgo";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const More = function({id, on_press_more, index}) {
  const item = useCachedData.cache_get(id);

  const on_press_more_inner = function() {
    _.isFunction(on_press_more) && on_press_more(id, index);
  };
  
  return <TouchableOpacity onPress={on_press_more_inner}><View style={{alignItems: "center", marginLeft: item.depth * 20}}><HelperText>More replies</HelperText></View></TouchableOpacity>;
};


const Comment = function({id, index, navigation, on_press_like, on_press_reply, on_press_likes, on_press_replies, is_being_commented_on, state, on_press_more}) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(1));
  const [is_liking, set_is_liking] = useState(false);
  const [is_unliking, set_is_unliking] = useState(false);

  const comment = useCachedData.cache_get(id);
  
  if (!comment) {
    return null;
  }
  const user = useCachedData.cache_get(comment.uid);
  if (!user) {
    return null;
  }
  
  const comment_snap = useCachedData.cache_get_snap(id);
  const user_snap = useCachedData.cache_get_snap(comment.uid);
  
  
  const on_press_user = function() {
    navigation.push("UserScreen", {id: comment.uid});
  };
  
  const on_press_reply_inner = function() {
    _.isFunction(on_press_reply) && on_press_reply(comment.id, index);
  };
  
  const on_press_like_inner = async function() {
    _.isFunction(on_press_like) && on_press_like(comment.id);
    if (!comment.is_liked) {
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
        await firestore.create_like({
          parent: comment
        }); 
      } catch (e) {
        $.logger.error(e);
      } finally {
        set_is_liking(false);
      }
    } else {
      set_is_unliking(true);
      try {
        await firestore.delete_like({
          parent: comment
        }); 
      } catch (e) {
        $.logger.error(e);
      } finally {
        set_is_unliking(false);
      }
    }
  };
  
  const on_press_likes_inner = function() {
    _.isFunction(on_press_likes) && on_press_likes();
    navigation.push("UserListScreen", {screen: "LikersScreen", id: id});
  };
  
  const on_press_replies_inner = function() {
    _.isFunction(on_press_replies) && on_press_replies(id, index);
  };
  
  const like_count = _.isNumber(comment_snap.like_count) ? comment_snap.like_count : 0;
  const comment_count = _.isNumber(comment_snap.comment_count) ? comment_snap.comment_count : 0;
  
  const inner = (
    <View style={{padding: 10, marginLeft: comment_snap.depth * 20 }}>
      {is_being_commented_on && (
        <HelperText style={{marginBottom: 10}}>Replying to</HelperText>
      )}
      <View style={{flexDirection: "row"}}>
        <TouchableOpacity onPress={on_press_user}>
          <Avatar.Image size={30} source={{uri: user_snap.profile_image_url}} style={{marginRight: 8}}/>
        </TouchableOpacity>

        <Text style={{flex: 1, marginTop: 2}}>
          <Text style={{fontSize: 14, fontWeight: "700"}} onPress={on_press_user}>{user_snap.username} </Text>
          <Text style={{fontSize: 13}}>{comment_snap.text}</Text>
        </Text>
      </View>
      
      
      <View style={{flexDirection: "row", marginTop: 4,  paddingLeft: 38, alignItems: "center"}}>
        <LiveTimeAgo style={{fontSize: 12}} date={comment_snap.created_at.toDate()} style={{marginRight: 16, fontSize: 12, color: colors.outline, width: 60}}/>
        <TouchableOpacity onPress={on_press_like_inner}>
          <Animated.View style={{ transform: [{ scale: anim.current }] }}>
          <MaterialCommunityIcons name={((is_liking || comment_snap.is_liked) && !is_unliking) ? "heart" : "heart-outline"} size={20} style={((is_liking || comment_snap.is_liked) && !is_unliking) ? {color: "red"} : {color: colors.outline}}/>
          </Animated.View>
        </TouchableOpacity>
        {like_count > 0 && (
          <TouchableOpacity onPress={on_press_likes_inner}>
            <Text style={{fontSize: 12, width: 60, color: colors.outline}}>  {like_count} {like_count === 1 ? "like" : "likes"}</Text>
          </TouchableOpacity>
        )}
        {like_count <= 0 && <View style={{width: 20}}/>}
        <TouchableOpacity onPress={on_press_reply_inner}>
          <MaterialCommunityIcons name={"comment-outline"} size={20} style={{color: colors.outline}}/>
        </TouchableOpacity>
        {(!state && comment_count > 0) && (
          <TouchableOpacity onPress={on_press_replies_inner}>
            <Text style={{fontSize: 12, color: colors.outline}}>  {comment_count} {comment_count === 1 ? "reply" : "replies"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  
  if (is_being_commented_on) {
    return <Fragment><Surface elevation={4}>{inner}</Surface>{on_press_more ? <More id={id} on_press_more={on_press_more} index={index}/> : null}</Fragment>;
  }

  return <Fragment>{inner}{on_press_more ? <More id={id} on_press_more={on_press_more} index={index}/> : null}</Fragment>;
};


export default Comment;