"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { FlatList, KeyboardAvoidingView, Platform, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Button, TextInput, useTheme } from "react-native-paper";
import firestore from "../../firestore/firestore";
import { collectionGroup, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import Post from "../../components/Post";
import Comment from "../../components/Comment";
import ListFooter from "../../components/ListFooter";
import useGlobalCache from "../../hooks/useGlobalCache";
import NotFound from "../../components/NotFound";

const FETCH_SIZE = 16;
const REPLIES_FETCH_SIZE = 2;

const Header = function({ id, navigation, ref_comment_input, on_press_comment, on_press_comments }) {
  const { dark } = useTheme();
  const { cache_get, cache_get_snapshot } = useGlobalCache();
  const post = cache_get(id);
  const snap_post = cache_get_snapshot(id);
  const user = post ? cache_get(post.uid) : undefined;
  
  if (!post || !user) {
    return null;
  }

  return (
    <View style={{margin: 10, marginBottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
      {!snap_post && (
        <View style={{marginBottom: 20, padding: 20, paddingLeft: 30}}>
          { dark && <Image source={require("../../assets/dark-puzzled-500.png")} style={{width: $.const.image_sizes["1"].width-40, height: $.const.image_sizes["1"].width-40}}/>}
          { !dark && <Image source={require("../../assets/light-puzzled-500.png")} style={{width: $.const.image_sizes["1"].width-40, height: $.const.image_sizes["1"].width-40}}/>}
        </View>
      )}
      
      {snap_post && <Post id={post.id} navigation={navigation} on_press_comment={on_press_comment} on_press_comments={on_press_comments} number_columns="1" screen="PostScreen"/>}
    </View>
  );
};

const PostScreen = function({navigation, route}) {
  const toast = useToast();
  const [comment_text, set_comment_text] = useState("");
  const [is_comment_text_good, set_is_comment_text_good] = useState(false);
  const ref_list = useRef();
  const ref_comment_input = useRef();
  const [is_sending_comment, set_is_sending_comment] = useState(false);
  const { colors } = useTheme();
  
  let id;
  if (route.params && route.params.id) {
    id = route.params.id;
  }
  
  let is_auto_focus = route.params && route.params.is_auto_focus;
  
  const { cache_set_posts, cache_set_comments, cache_get_fetcher, cache_get_fetcher_snapshot, cache_get, cache_get_snapshot  } = useGlobalCache();
  
  const fetcher = cache_get_fetcher(id);
  const snap_fetcher = cache_get_fetcher_snapshot(id);
  
  const post = cache_get(id);
  const snap_post = cache_get_snapshot(id);
  
  const fetch_post = async function() {
    const posts = await firestore.fetch_posts([id]);
    cache_set_posts(posts);
  };

  useEffect(() => {
    fetch_post();
    refresh();
  }, []);
  
  const fetch = async function() {
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
      return;
    }

    const query_args = [collectionGroup($.db, "comments"), where("parent_id", "==", post.id), orderBy("created_at", "desc"), limit(FETCH_SIZE + 1)];
    if (fetcher.default.cursor) {
      query_args.push(startAfter(fetcher.cursor));
    }
    const q_comment = query(...query_args);
    fetcher.default.cursor ? fetcher.default.is_loading_more = true : fetcher.default.is_refreshing = true;
    const comments = [];
    try {
      const snap_comments = await getDocs(q_comment);
      if (!fetcher.default.cursor) {
        fetcher.default.data = [];
      }
      
      let docs = snap_comments.docs;
      const size = _.size(docs);
      
      if (size === (FETCH_SIZE + 1)) {
        docs = _.initial(docs);
        fetcher.default.cursor = _.last(docs);
      } else {
        fetcher.default.cursor = undefined;
      }
      
      let data;
      if (size > 0) {
        _.each(docs, function(doc_comment) {
          comments.push(doc_comment.data());
        });
        await firestore.fetch_comment_dependencies(comments);
        data = cache_set_comments(comments);
      } else {
        data = [];  
      }

      if (fetcher.default.is_refreshing) {
        fetcher.default.data = data;
      } else {
        fetcher.default.data = [...fetcher.default.data, ...data];
      }

      if (route.params && route.params.is_scroll_to_comments && fetcher.default.is_first_refresh && _.size(data)) {
        scroll_to_index(0, 0.2, 400);
      }
      fetcher.default.is_first_refresh = false;
    } catch (e) {
      $.logger.error(e);
      fetcher.default.is_loading_more ? fetcher.default.is_load_more_error = true : fetcher.default.is_refresh_error = true;
      $.display_error(toast, new Error("Something went wrong!"));
    } finally {
      fetcher.default.is_loading_more ? fetcher.default.is_loading_more = false : fetcher.default.is_refreshing = false;
    }
  };

  const fetch_replies = async function(parent_id, index) {
    if (!fetcher[parent_id]) {
      fetcher[parent_id] = {};
    }
    if (fetcher[parent_id].is_refreshing || fetcher[parent_id].is_loading_more) {
      return;
    }

    const query_args = [collectionGroup($.db, "comments"), where("parent_id", "==", parent_id), orderBy("created_at", "desc"), limit(REPLIES_FETCH_SIZE + 1)];
    if (fetcher[parent_id].cursor_comment_id) {
      const comment = cache_get(fetcher[parent_id].cursor_comment_id);
      if (comment) {
        query_args.push(startAfter(comment.created_at)); 
      }
    }
    const q_comment = query(...query_args);
    fetcher[parent_id].cursor_comment_id ? fetcher[parent_id].is_loading_more = true : fetcher[parent_id].is_refreshing = true;
    const comments = [];
    try {
      const snap_comments = await getDocs(q_comment);
      let docs = snap_comments.docs;
      const size = _.size(docs);
      
      if (size === (REPLIES_FETCH_SIZE + 1)) {
        docs = _.initial(docs);
        fetcher[parent_id].cursor_comment_id = (_.last(docs)).data().id;
      } else {
        fetcher[parent_id].cursor_comment_id = undefined;
      }
      
      let data;
      if (size > 0) {
        _.each(docs, function(doc_comment) {
          comments.push(doc_comment.data());
        });
        await firestore.fetch_comment_dependencies(comments);
        data = cache_set_comments(comments);
        fetcher.default.data.splice(index || 0 , 0, ...data);
      }
      fetcher[parent_id].is_refreshed = true;
      fetcher[parent_id].is_replies_open = true;
    } catch (e) {
      $.logger.error(e);
      fetcher[parent_id].is_loading_more ? fetcher[parent_id].is_load_more_error = true : fetcher[parent_id].is_refresh_error = true;
      $.display_error(toast, new Error("Something went wrong!"));
    } finally {
      fetcher[parent_id].is_loading_more ? fetcher[parent_id].is_loading_more = false : fetcher[parent_id].is_refreshing = false;
    }
  };
  
  const refresh = function() {
    fetcher.default.cursor = null;
    const keys_to_delete = [];
    _.each(fetcher, function(value, key) {
      if (key !== "id" && key !== "default") {
        keys_to_delete.push(key);
      }
    });
    _.each(keys_to_delete, function(key) {
      delete fetcher[key];
    });
    fetch_post();
    fetch();
  };
  
  const fetch_more = function() {
    if (!fetcher.default.cursor) {
      return;
    }
    fetch();
  };
  
  const on_press_retry = function() {
    fetcher.default.is_refresh_error = false;
    fetcher.default.is_load_more_error = false;
    fetch();
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const on_change_comment_text = function(text) {
    set_comment_text(text);
    if (text.trim().length > 0) {
      set_is_comment_text_good(true);
    } else {
      set_is_comment_text_good(false);
    }
  };
  
  const on_press_send = async function() {
    set_is_sending_comment(true);
    try {
      const target_index = _.isNumber(fetcher.default.target_index) ? fetcher.default.target_index : 0;
      const new_comment = await firestore.create_comment((fetcher.default.active_comment_id ? true : false), (fetcher.default.active_comment_id ? fetcher.default.active_comment_id : post.id), comment_text.trim());
      if (fetcher.default.active_comment_id) {
        const comment = cache_get(fetcher.default.active_comment_id);
        if (comment) {
          (comment && _.isNumber(comment.comment_count)) ? comment.comment_count++ : comment.comment_count = 1; 
        }
      } else {
        (post && _.isNumber(post.comment_count)) ? post.comment_count++ : post.comment_count = 1; 
      }
      
      cache_set_comments(new_comment);
      fetcher.default.data .splice(target_index || 0 , 0, {id: new_comment.id});
      set_comment_text("");
      set_is_comment_text_good(false);
      ref_comment_input.current.blur();
      scroll_to_index(target_index, 0.3, 400);
  
      let f = fetcher[fetcher.default.active_comment_id ? fetcher.default.active_comment_id : "default"];
      if (!f) {
        f = fetcher[fetcher.default.active_comment_id ? fetcher.default.active_comment_id : "default"] = {
          is_refreshed: true,
          is_replies_open: true,
          cursor_comment_id: new_comment.id,
          cursor: new_comment
        };
      }
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Something went wrong!."));
    } finally {
      set_is_sending_comment(false);
    }
  };
  
  const on_press_comment = function() {
    delete fetcher.default.active_comment_id;
    fetcher.default.input_focus_target = 0;
    ref_comment_input.current.focus();
  };
  
  const on_press_reply = function(id, index) {
    fetcher.default.input_focus_target = index-1;
    ref_comment_input.current.focus();
    fetcher.default.active_comment_id = id;
    fetcher.default.target_index = index;
  };
  
  const scroll_to_index = function(index, view_position, delay) {
    if (_.isNumber(delay)) {
      _.delay(function() {
        ref_list.current.scrollToIndex({
            index: index,
            viewPosition: _.isNumber(view_position) ? view_position : 0
        });
      }, delay);
    } else {
      ref_list.current.scrollToIndex({
        index: index,
        viewPosition: _.isNumber(view_position) ? view_position : 0
      }); 
    }
  };
  
  const on_press_comments = function() {
    scroll_to_index(0);
  };
  
  const on_press_replies = function(id, target_index) {
    const child_fetcher = fetcher[id];
    if (child_fetcher && !child_fetcher.is_replies_open && child_fetcher.is_refreshed) {
      child_fetcher.is_replies_open = true;
      return;
    }
    fetcher.default.target_index = target_index;
    fetch_replies(id, target_index);
  };
  
  const on_press_more = function(parent_id, target_index) {
    fetch_replies(parent_id, target_index);
  };
  
  const render_comment = function(row) {
    if (row.item === "empty_row") {
      return <View style={{height: 20}}/>;
    }
    const comment = cache_get(row.item.id);
    if (!comment) {
      return null;
    }
    return <Comment fetcher={fetcher} snap_child_fetcher={snap_fetcher[comment.id]} snap_parent_fetcher={snap_fetcher[comment.parent_id]} child_fetcher={fetcher[comment.id]} parent_fetcher={fetcher[comment.parent_id]}  id={ comment.id } index={ row.index } on_press_reply={on_press_reply} on_press_replies={on_press_replies} is_being_commented_on={snap_fetcher.default.active_comment_id === row.item.id} navigation={navigation} on_press_more={on_press_more} />;
  };
  
  const on_focus = function() {
    fetcher.default.is_commentbox_has_focus = true;
    scroll_to_index(fetcher.default.input_focus_target || 0, 0.5, 400); 
  };
  
  const on_blur = function() {
    delete fetcher.default.active_comment_id;
    delete fetcher.default.target_index;
    fetcher.default.is_commentbox_has_focus = false;
  };
  
  if (!post) {
    return <NotFound on_press_back={on_press_back}/>;
  }
  
  _.size(snap_fetcher.default.data);
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'top', 'left']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={"swen"}  />
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <FlatList
          contentContainerStyle={{paddingBottom: 64}}
          ref={ref_list}
          keyboardShouldPersistTaps="never"
          style={{flex: 1}}
          data={_.size(fetcher.default.data) ? fetcher.default.data : ["empty_row"]}
          renderItem={render_comment}
          keyExtractor = { item => _.isString(item) ? item : item.id }
          ListHeaderComponent = <Header id={id} navigation={navigation} on_press_comment={on_press_comment} on_press_comments={on_press_comments} ref_list={ref_list} is_error={null} on_press_retry={on_press_retry}/>
          ListFooterComponent = <ListFooter is_error={fetcher.default.is_load_more_error} is_loading_more={fetcher.default.is_loading_more} on_press_retry={on_press_retry}/>
          onEndReached={fetch_more}
          removeClippedSubviews={true}
          refreshControl = {
            <RefreshControl
              refreshing={snap_fetcher.default.is_refreshing}
              onRefresh={refresh}
              tintColor={colors.secondary}
              colors={[colors.secondary]}
            />
          }
        />
        {_.isObject(snap_post)  && (
          <View>
            <TextInput ref={ref_comment_input} label="Comment" multiline={true} value={comment_text} onChangeText={on_change_comment_text} style={{maxHeight: 160, paddingRight: 76, fontSize: 14}} autoFocus={is_auto_focus} onFocus={on_focus} onBlur={on_blur}/>
            <View style={{position: "absolute", bottom: 0, top: 0, right: 8, justifyContent: "center"}}>
              <Button mode="contained" onPress={on_press_send} disabled={!is_comment_text_good || is_sending_comment} compact={true} style={{paddingHorizontal: 6}}>Send</Button>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default PostScreen;