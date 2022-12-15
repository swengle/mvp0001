"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { Animated, FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Avatar, Appbar, Button, Divider, Menu, Text, TextInput, useTheme } from "react-native-paper";
import FastImage from 'react-native-fast-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import { useToast } from "react-native-toast-notifications";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { TouchableOpacity } from "react-native-gesture-handler";
import TapDetector from "../../components/TapDetector";
import LiveTimeAgo from "../../components/LiveTimeAgo";
import useCachedData from "../../hooks/useCachedData";

const Header = function({ id, navigation, ref_comment_input, on_press_comment }) {
  const anim = useRef(new Animated.Value(1));
  const { colors } = useTheme();
  const [is_liking, set_is_liking] = useState(false);
  const [is_unliking, set_is_unliking] = useState(false);
  const { cache_get_snap } = useCachedData();
  const snap_post = cache_get_snap(id);
  
  if (!snap_post) {
    return null;
  }
  
  const snap_user = cache_get_snap(snap_post.uid);
  if (!snap_user || snap_post.is_deleted) { // can't check this earlier to keep hook counts the same
    return null;
  }
  
  const on_press_comments = function() {
    console.log("comments");
  };
  
  const on_press_comment_inner = function() {
    on_press_comment();
  };
  
  const on_press_likes = function() {
    
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
  
  const on_press_user = function() {
    navigation.push("UserScreen", {uid: snap_user.id});
  };
  
  return (
    <View>
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <TouchableOpacity onPress={on_press_user}>
          <View style={{flex:1, flexDirection: "row", alignItems: "center"}}>
            <Avatar.Image size={50} source={{uri: snap_user.profile_image_url}} style={{marginRight: 8}}/>
            <Text variant="titleMedium">{snap_user.username}</Text>
          </View>
        </TouchableOpacity>
        <View style={{flex:1}}/>
        <LiveTimeAgo variant="labelSmall" date={snap_post.created_at.toDate()}/>
      </View>
      <Text style={{margin: 10, marginTop: 0}}>
        This is some text to go with this thing! This is some text to go with this thing! This is some text to go
      </Text>
      <TapDetector on_double_tap={on_press_like}>
        <FastImage source={{uri: snap_post.image_urls["1080"].url}} style={{width: $.const.image_sizes[1].width, height: $.const.image_sizes[1].height, borderWidth: 1, borderColor: colors.background}}/>
      </TapDetector>
      <View style={{flexDirection: "row", alignItems: "center", marginVertical: 4}}>
        <TouchableOpacity onPress={on_press_like} style={{alignItems: "center", marginLeft: 10}} activeOpacity={0.8}>
          <Animated.View style={{ transform: [{ scale: anim.current }] }}>
            <Text><MaterialCommunityIcons name={((is_liking || snap_post.is_liked) && !is_unliking) ? "heart" : "heart-outline"} size={32} style={((is_liking || snap_post.is_liked) && !is_unliking) ? {color: "red"} : {}}/></Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: "row", alignItems: "center", padding: 10}} onPress={on_press_likes}>
          <Text variant="titleSmall">2 </Text>
          <Text>likes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={on_press_comment_inner} style={{alignItems: "center", marginLeft: 20}} activeOpacity={0.8}>
          <Text><MaterialCommunityIcons name={"comment-outline"} size={32} style={{}}/></Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flexDirection: "row", alignItems: "center", padding: 10}} onPress={on_press_comments}>
          <Text variant="titleSmall">2 </Text>
          <Text>comments</Text>
        </TouchableOpacity>
      </View>
      <Divider/>
      <Divider/>
    </View>
  );
};

const PostScreen = function({ navigation, route }) {
  const [is_more_menu_visible, set_is_more_menu_visible] = useState(false);
  const [comment_text, set_comment_text] = useState("");
  const [is_comment_text_good, set_is_comment_text_good] = useState(false);
  const ref_list = useRef();
  const ref_comment_input = useRef();
  const toast = useToast();
  let id, is_auto_focus;
  if (route && route.params) {
    id = route.params.id;
    is_auto_focus = route.params.is_auto_focus;
  }
  const { cache_snap_data, cache_get_snap } = useCachedData();
  
  const snap_post = cache_get_snap(id);

  useEffect(() => {
    if (!is_auto_focus) {
      return;
    }
    _.delay(function() {
      ref_list.current.scrollToIndex({
        index: 0,
        viewPosition: 0
      });
    }, 500);
  }, []);
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
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
  
  const on_change_comment_text = function(text) {
    set_comment_text(text);
    if (text.trim().length > 0) {
      set_is_comment_text_good(true);
    } else {
      set_is_comment_text_good(false);
    }
  };
  
  const on_press_retry = function() {
    
  };
  
  const render_comment = function(row) {
    if (row.item === "nothing") {
      return <View style={{height: 100}}/>;
    }
    return null;
  };
  
  const on_press_send = function() {
    
  };
  
  const on_press_comment = function() {
    ref_comment_input.current.focus();
    _.delay(function() {
      ref_list.current.scrollToIndex({
        index: 0,
        viewPosition: 0
      });
    }, 500);
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
        <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <FlatList
            ref={ref_list}
            style={{flex: 1}}
            data={_.size(cache_snap_data.data) === 0 ? ["nothing"] : cache_snap_data.data }
            renderItem={render_comment}
            keyExtractor = { item => item }
            ListHeaderComponent = <Header id={snap_post.id} navigation={navigation} on_press_comment={on_press_comment} ref_list={ref_list} is_error={null} on_press_retry={on_press_retry}/>
            horizontal={false} 
  
            /*
            ListFooterComponent = <ListFooter is_error={is_load_more_error} is_loading_more={is_loading_more} on_press_retry={on_press_retry}/>
            ListEmptyComponent = <ListEmpty data={snap_cached_data.data} text="No posts found"/>
            refreshControl={
              <RefreshControl
                refreshing={is_refreshing}
                onRefresh={refresh}
                tintColor={colors.secondary}
                colors={[colors.secondary]}
              />
            }
            onEndReached={fetch_more}
            removeClippedSubviews={true}
            numColumns={number_columns}
            horizontal={false}
            onEndReachedThreshold={0.5}
            */
          />
          <View>
            <TextInput ref={ref_comment_input} label="Comment" multiline={true} value={comment_text} onChangeText={on_change_comment_text} style={{maxHeight: 160, paddingRight: 76, fontSize: 14}} autoFocus={is_auto_focus}/>
            <View style={{position: "absolute", bottom: 0, top: 0, right: 8, justifyContent: "center"}}>
              <Button mode="contained" onPress={on_press_send} disabled={!is_comment_text_good} compact={true} style={{paddingHorizontal: 6}}>Send</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};


export default PostScreen;
