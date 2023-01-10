"use strict";
import $ from "../setup";
import _ from "underscore";
import { Fragment, useRef } from "react";
import { Animated, View } from 'react-native';
import { ActivityIndicator, Avatar, HelperText, Text, Surface, useTheme } from "react-native-paper";
import useGlobalCache from "../hooks/useGlobalCache";
import firestore from "../firestore/firestore";
import TouchableOpacity  from "../components/TouchableOpacity";
import LiveTimeAgo from "../components/LiveTimeAgo";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const More = function({id, on_press_more, index, is_loading_more}) {
  const comment = useGlobalCache.cache_get(id);

  const on_press_more_inner = function() {
    _.isFunction(on_press_more) && on_press_more(comment.parent_id, index + 1);
  };
  
  if (is_loading_more) {
    return (
      <View style={{paddingTop: 10, paddingBottom: 10, alignItems: "center", marginLeft: comment.depth * 20}}>
        <ActivityIndicator size={14}/>
      </View>
    );
  }
  
  return (
    <TouchableOpacity onPress={on_press_more_inner}>
      <HelperText>More replies</HelperText>
    </TouchableOpacity>
  );
};

const HideReplies = function({is_loading_more, parent_fetcher}) {
  
  const on_press_hide_replies = function() {
    parent_fetcher.is_replies_open = false;
  };
  
  if (is_loading_more) {
    return null;
  }
  
  return (
    <TouchableOpacity onPress={on_press_hide_replies}>
      <HelperText>Hide replies</HelperText>
    </TouchableOpacity>
  );
};

const Comment = function({fetcher, snap_child_fetcher, snap_parent_fetcher, child_fetcher, parent_fetcher, id, index, navigation, on_press_like, on_press_reply, on_press_likes, on_press_replies, is_being_commented_on, on_press_more}) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(1));
  const { cache_get, cache_get_snapshot  } = useGlobalCache();

  const comment = cache_get(id);
  const user = cache_get(comment ? comment.uid : undefined);
  const comment_snap = cache_get_snapshot(id);
  const user_snap = cache_get_snapshot(comment ? comment.uid : undefined);

  
  if (!comment || !user) {
    return null;
  }
  
  
  const on_press_user = function() {
    navigation.push("PostListScreen", {screen: "UserScreen", id: comment.uid});
  };
  
  const on_press_reply_inner = function() {
    _.isFunction(on_press_reply) && on_press_reply(comment.id, index + 1);
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
      _.isNumber(comment.like_count) ? comment.like_count++ : comment.like_count = 1;
      comment.is_liked = true;
      try {
        await firestore.create_like(true, comment.id);
      } catch (e) {
        $.logger.error(e);
        comment.like_count--;
        comment.is_liked = false;
      }
    } else {
      _.isNumber(comment.like_count) ? comment.like_count-- : comment.like_count = 0;
      comment.is_liked = false;
      try {
        await firestore.delete_like(comment.id);
      } catch (e) {
        comment.like_count++;
        comment.is_liked = true;
        $.logger.error(e);
      }
    }
  };
  
  const on_press_likes_inner = function() {
    _.isFunction(on_press_likes) && on_press_likes();
    navigation.push("UserListScreen", {screen: "LikersScreen", id: id});
  };
  
  const on_press_replies_inner = function() {
    if (fetcher.default.hidden_path_map && fetcher.default.hidden_path_map[comment.path]) {
      delete fetcher.default.hidden_path_map[comment.path];
    }
    _.isFunction(on_press_replies) && on_press_replies(id, index + 1);
  };
  
  const on_press_hide_replies_inner = function() {
    child_fetcher.is_replies_open = false;
    if (!fetcher.default.hidden_path_map) {
      fetcher.default.hidden_path_map = {};
    }
    fetcher.default.hidden_path_map[comment.path] = true;
  };
  
  let is_path_visible = true;
  _.each(fetcher.default.hidden_path_map && _.keys(fetcher.default.hidden_path_map), function(path) {
    if ((comment.path.length > path.length) && comment.path.indexOf(path) !== -1) {
      is_path_visible = false;
    }
  });
  
  if (!is_path_visible) {
    return null;
  }
  
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
      
      
      <View style={{flexDirection: "row", marginTop: 4, paddingLeft: 38, alignItems: "center"}}>
        <LiveTimeAgo style={{fontSize: 12}} date={comment_snap.created_at.toDate()} style={{marginRight: 16, fontSize: 12, color: colors.outline, width: 60}}/>
        <TouchableOpacity onPress={on_press_like_inner}>
          <Animated.View style={{ transform: [{ scale: anim.current }] }}>
          <MaterialCommunityIcons name={comment_snap.is_liked ? "heart" : "heart-outline"} size={20} style={comment_snap.is_liked ? {color: "red"} : {color: colors.outline}}/>
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
        {(comment_count > 0) && (
          <Fragment>
            {snap_child_fetcher && snap_child_fetcher.is_refreshing && <ActivityIndicator style={{marginLeft: 16}} size={14}/>}
            {(!snap_child_fetcher || (!snap_child_fetcher.is_refreshing && !snap_child_fetcher.is_replies_open)) && <TouchableOpacity onPress={on_press_replies_inner} style={{marginLeft: 4}}><Text style={{fontSize: 12, color: colors.outline}}>  {comment_count} {comment_count === 1 ? "reply" : "replies"}</Text></TouchableOpacity>}
            {(snap_child_fetcher && snap_child_fetcher.is_replies_open) && <TouchableOpacity onPress={on_press_hide_replies_inner} style={{marginLeft: 4}}><Text style={{fontSize: 12, color: colors.outline}}> {comment_count === 1 ? "Hide reply" : "Hide replies"}</Text></TouchableOpacity>}
          </Fragment>
        )}
      </View>
    </View>
  );
  
  if (is_being_commented_on) {
    return (
      <Fragment>
        <Surface elevation={4}>
          {inner}
        </Surface>
        <View style={{flexDirection: "row", paddingLeft: 38, paddingRight: 10, marginLeft: comment_snap.depth * 20}}>
          {snap_parent_fetcher && snap_parent_fetcher.cursor_comment_id === id && <More id={id} on_press_more={on_press_more} index={index} is_loading_more={snap_parent_fetcher.is_loading_more}/>}
          {false && snap_parent_fetcher && snap_parent_fetcher.cursor_comment_id === id && snap_parent_fetcher.is_replies_open && <HideReplies is_loading_more={snap_parent_fetcher.is_loading_more} parent_fetcher={parent_fetcher}/>}
        </View>
      </Fragment>
    );
  }
  
  return (
    <Fragment>
      {inner}
      <View style={{flexDirection: "row", paddingLeft: 38, paddingRight: 10, marginLeft: comment_snap.depth * 20}}>
        {snap_parent_fetcher && snap_parent_fetcher.cursor_comment_id === id && <More id={id} on_press_more={on_press_more} index={index} is_loading_more={snap_parent_fetcher.is_loading_more}/>}
        {false && snap_parent_fetcher && snap_parent_fetcher.cursor_comment_id === id && snap_parent_fetcher.is_replies_open && <HideReplies is_loading_more={snap_parent_fetcher.is_loading_more} parent_fetcher={parent_fetcher}/>}
      </View>
    </Fragment>
  );
};


export default Comment;