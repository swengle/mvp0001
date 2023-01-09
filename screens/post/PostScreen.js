"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { FlatList, KeyboardAvoidingView, Platform, View } from 'react-native';
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
const SUBCOMMENT_FETCH_SIZE = 1;

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
      
      {snap_post && <Post id={post.id} navigation={navigation} number_columns={1} on_press_comment={on_press_comment} on_press_comments={on_press_comments}/>}
    </View>
  );
};

const PostScreen = function({navigation, route}) {
  const toast = useToast();
  const [is_more_menu_visible, set_is_more_menu_visible] = useState(false);
  const [comment_text, set_comment_text] = useState("");
  const [is_comment_text_good, set_is_comment_text_good] = useState(false);
  const ref_list = useRef();
  const ref_comment_input = useRef();
  const [is_sending_comment, set_is_sending_comment] = useState(false);
  let input_focus_target;
  
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
  
  const load_post = async function() {
    const users = await firestore.fetch_posts([id]);
    cache_set_posts(users);
  };

  useEffect(() => {
    load_post();
    refresh();
  }, []);
  
  const fetch = async function() {
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
      return;
    }

    const query_args = [collectionGroup($.db, "reactions"), where("parent_id", "==", post.id), where("kind", "==", "comment"), orderBy("created_at", "desc"), limit(FETCH_SIZE + 1)];
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
        fetcher.default.cursor = null;
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
  
  /*
  const fetch_subcomments = async function(parent_id, index) {
    if (!cache_data.fetchers[parent_id]) {
      cache_data.fetchers[parent_id] = {};
    }
    if (cache_data.fetchers[parent_id].is_refreshing || cache_data.fetchers[parent_id].is_loading_more) {
      return;
    }

    const query_args = [collectionGroup($.db, "reactions"), where("parent_id", "==", parent_id), where("kind", "==", "comment"), orderBy("created_at", "desc"), limit(SUBCOMMENT_FETCH_SIZE+1)];
    if (cache_data.fetchers[parent_id].cursor) {
      query_args.push(startAfter(cache_data.fetchers[parent_id].cursor));
    }
    const q_comment = query(...query_args);
    cache_data.fetchers[parent_id].cursor ? cache_data.fetchers[parent_id].is_loading_more = true : cache_data.fetchers[parent_id].is_refreshing = true;
    const comments = [];
    try {
      const snap_comments = await getDocs(q_comment);
      
      let docs = snap_comments.docs;
      if (_.size(docs) === (SUBCOMMENT_FETCH_SIZE + 1)) {
        docs = _.initial(docs);
        cache_data.fetchers[parent_id].cursor = _.last(docs);
      } else {
        cache_data.fetchers[parent_id].cursor = null;
      }
      
      if (_.size(docs) === 0) {
        return;
      }
      
      _.each(docs, function(doc_comment) {
        comments.push(doc_comment.data());
      });
      
      await firestore.fetch_comment_dependencies(comments);
      _.each(comments, function(comment) {
        cache_set(comment);
      });
      
      cache_sync(_.isNumber(index) ? index + 1 : 0);

      cache_data.fetchers[parent_id].is_first_refresh = false;
    } catch (e) {
      $.logger.error(e);
      cache_data.fetchers[parent_id].is_loading_more ? cache_data.fetchers[parent_id].is_load_more_error = true : cache_data.fetchers[parent_id].is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.fetchers[parent_id].is_loading_more ? cache_data.fetchers[parent_id].is_loading_more = false : cache_data.fetchers[parent_id].is_refreshing = false;
    }
  };
  */
  
  const refresh = function() {
    fetcher.default.cursor = null;
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
  
  const on_dismiss_more_menu = function() {
    set_is_more_menu_visible(false);
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
    const params = {
      parent_user_id: post.uid,
      parent_id: post.id,
      parent_kind: "post",
      text: comment_text.trim()
    };
    if (fetcher.default.active_comment_id) {
      params.parent_id = fetcher.default.active_comment_id;
      params.parent_kind = "reaction";
    }
    set_is_sending_comment(true);
    try {
      const target_index = _.isNumber(fetcher.default.active_comment_index) ? (fetcher.default.active_comment_index + 1) : 0;
      const new_comment = await firestore.create_comment(params.parent_user_id, params.parent_id, params.parent_kind, params.text);
      (post && _.isNumber(post.comment_count)) ? post.comment_count++ : post.comment_count = 1;
      cache_set_comments(new_comment);
      fetcher.default.data .splice(target_index || 0 , 0, {id: new_comment.id});
      set_comment_text("");
      set_is_comment_text_good(false);
      ref_comment_input.current.blur();
      scroll_to_index(target_index, 0.3, 400);
    } catch (e) {
      $.logger.error(e);
      $.display_error(toast, new Error("Failed to send comment. Try again."));
    } finally {
      set_is_sending_comment(false);
    }
  };
  
  const on_press_comment = function() {
    delete fetcher.default.active_comment_id;
    input_focus_target = 0;
    ref_comment_input.current.focus();
  };
  
  const on_press_reply = function(id, index) {
    input_focus_target = index;
    ref_comment_input.current.focus();
    fetcher.default.active_comment_id = id;
    fetcher.default.active_comment_index = index;
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
  
  const on_press_replies = function(id, index) {
    //cache_data.active_comment_index = index;
    //fetch_subcomments(id, index);
  };
  
  const on_press_more = function(parent_id, index) {
    //fetch_subcomments(parent_id, index);
  };
  
  const render_comment = function(row) {
    if (row.item === "nothing") {
      return <View style={{height: 100}}/>;
    }

    return <Comment id={ row.item.id } index={ row.index } on_press_reply={on_press_reply} on_press_replies={on_press_replies} is_being_commented_on={snap_fetcher.default.active_comment_id === row.item} navigation={navigation} state={snap_fetcher[row.item.id]} on_press_more={(snap_fetcher[row.item.id] && snap_fetcher[row.item.id].cursor) ? on_press_more : undefined}/>;
  };
  
  const on_focus = function() {
    fetcher.default.is_commentbox_has_focus = true;
    scroll_to_index(input_focus_target || 0, 0.5, 400);
  };
  
  const on_blur = function() {
    delete fetcher.default.active_comment_id;
    delete fetcher.default.active_comment_index;
    fetcher.default.is_commentbox_has_focus = false;
  };
  
  if (!post) {
    return <NotFound on_press_back={on_press_back}/>;
  }
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'top', 'left']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={"swen"}  />
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <FlatList
          contentContainerStyle={{paddingBottom: 100}}
          ref={ref_list}
          keyboardShouldPersistTaps="never"
          style={{flex: 1}}
          data={_.size(fetcher.default.data) === 0 ? ["nothing"] : fetcher.default.data}
          renderItem={render_comment}
          keyExtractor = { item => _.isString(item) ? item : item.id }
          ListHeaderComponent = <Header id={id} navigation={navigation} on_press_comment={on_press_comment} on_press_comments={on_press_comments} ref_list={ref_list} is_error={null} on_press_retry={on_press_retry}/>
          ListFooterComponent = <ListFooter is_error={fetcher.default.is_load_more_error} is_loading_more={fetcher.default.is_loading_more} on_press_retry={on_press_retry}/>
          onEndReached={fetch_more}
          removeClippedSubviews={true}
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