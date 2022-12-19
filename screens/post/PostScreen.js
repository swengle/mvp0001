"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Button, Menu, TextInput } from "react-native-paper";
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from "../../firestore/firestore";
import { useToast } from "react-native-toast-notifications";
import useCachedData from "../../hooks/useCachedData";
import Post from "../../components/Post";
import NotFound from "../../components/NotFound";

const Header = function({ id, navigation, ref_comment_input, on_press_comment }) {
  return <Post id={id} navigation={navigation} number_columns={1} screen="PostScreen" on_press_comment={on_press_comment}/>;
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
  const { cache_snap_data, cache_get, cache_get_snap } = useCachedData();
  
  const post = cache_get(id);
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
        post: post
      });
    } catch (e) {
      $.logger.error(e);
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
        <Appbar.Content title="" />
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
        <NotFound/>
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
