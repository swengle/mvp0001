"use strict";
import $ from "../../setup";
import _ from "underscore";
import { Fragment, useEffect, useRef, useState } from "react";
import { useToast } from "react-native-toast-notifications";
import { FlatList, Image, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Avatar, Badge, Button, Chip, Divider, Text, TextInput, useTheme } from "react-native-paper";
import * as Contacts from 'expo-contacts';
import firestore from "../../firestore/firestore";
import useCachedData from "../../hooks/useCachedData";
import { collectionGroup, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import UserPost from "../../components/UserPost";
import Comment from "../../components/Comment";
import ListFooter from "../../components/ListFooter";

const FETCH_SIZE = 16;
const SUBCOMMENT_FETCH_SIZE = 1;

const get_relationship_action = function(status) {
  if (status === "none" || status === "unfollow") {
      return "follow";
    } else if (status === "request" || status === "follow" || status === "ignore") {
      return "unfollow";
    } else if (status === "block") {
      return "unblock";
    }
};

const get_relationship_button_text = function(status) {
  if (status === "none" || status === "unfollow") {
    return "Follow";
  } else if (status === "follow") {
    return "Following";
  } else if (status === "request" || status === "ignore") {
    return "Requested";
  } else if (status === "block") {
    return "Unblock";
  }
  return status;
};


const Header = function({ id, navigation, ref_comment_input, on_press_comment, on_press_comments }) {
  const toast = useToast();
  const { dark } = useTheme();
  const [busy_button_text, set_busy_button_text] = useState();
  
  const user = useCachedData.cache_get(id);
  if (!user || user.is_deleted) {
    return null;
  }
  const snap_user = useCachedData.cache_get_snap(id);
  
  const on_press_followers = function() {
    navigation.push("UserListScreen", {id: id, screen: "FollowersScreen"});
  };
  
  const on_press_following = function() {
    navigation.push("UserListScreen", {id: id, screen: "FollowingScreen"});
  };

  const on_press_relationship = async function() {
    try {
      const action = get_relationship_action(user.outgoing_status);
      if (action === "follow") {
        set_busy_button_text(user.is_account_public ? "Following" : "Requested");
      } else if (action === "unfollow" || action === "unblock") {
        user.outgoing_status = "none";
        set_busy_button_text("Follow");
      } else if (action === "block") {
        set_busy_button_text("Unblock");
      }
      
      await firestore.update_relationship({
        id : id,
        action: action
      });
    } catch (e) {
      $.logger.error(e);
      set_busy_button_text(null);
      $.display_error(toast, new Error("Failed to update relationship."));
    }
  };

  return (
    <Fragment>
      <View style={{margin: 10, marginBottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
        <Avatar.Image size={80} source={{uri: snap_user.profile_image_url}} />
  
        <View style={{flex: 1, flexDirection: "column"}}>
          <View style={{flex: 1}}/>
          {snap_user.name && (<Text variant="titleMedium" style={{alignSelf: "center", marginBottom: 4}}>{snap_user.name}</Text>)}
          <View style={{flexDirection: "row", justifyContent: "center", height: 40}}>
            <Chip style={{marginRight: 8, alignItems: "center"}} mode="outlined" onPress={on_press_followers}>{snap_user.follow_by_count || 0} {snap_user.follow_by_count === 1 ? "Follower" : "Followers"}</Chip>
            <Chip style={{alignItems: "center"}} mode="outlined" onPress={on_press_following}>{snap_user.follow_count || 0} Following</Chip>
          </View>
          {(id !== $.session.uid) && <Button mode="contained" style={{marginTop: 10, marginHorizontal: 10}} onPress={on_press_relationship}>{busy_button_text ? busy_button_text : get_relationship_button_text(snap_user.outgoing_status)}</Button>}
          <View style={{flex: 1}}/>
        </View>
      </View>
  
      {false && (
        <View style={{margin: 10, marginTop: 0}}>
          {(false && snap_user.bio) && <Text>{snap_user.bio}</Text>}
        </View>
      )}
      
      <Divider style={{marginTop: 10, marginBottom: 10}}/>
      
      {!snap_user.current_post && (
        <View style={{marginBottom: 20, padding: 20, paddingLeft: 30}}>
          { dark && <Image source={require("../../assets/dark-puzzled-500.png")} style={{width: $.const.image_sizes["1"].width-40, height: $.const.image_sizes["1"].width-40}}/>}
          { !dark && <Image source={require("../../assets/light-puzzled-500.png")} style={{width: $.const.image_sizes["1"].width-40, height: $.const.image_sizes["1"].width-40}}/>}
        </View>
      )}
      
      {snap_user.current_post && <UserPost id={snap_user.id} navigation={navigation} number_columns={1} screen="UserScreen" on_press_comment={on_press_comment} on_press_comments={on_press_comments}/>}
      
      <Divider/>
    </Fragment>
  );
};

const UserScreen= function({navigation, route}) {
  const toast = useToast();
  const [is_more_menu_visible, set_is_more_menu_visible] = useState(false);
  const [comment_text, set_comment_text] = useState("");
  const [is_comment_text_good, set_is_comment_text_good] = useState(false);
  const ref_list = useRef();
  const ref_comment_input = useRef();
  const [is_sending_comment, set_is_sending_comment] = useState(false);
  let input_focus_target;
  
  let id, is_tabs_screen;
  if (route.params && route.params.id) {
    id = route.params.id;
    is_tabs_screen = false;
  } else {
    id = $.session.uid;
    is_tabs_screen = true;
  }
  
  let is_auto_focus = route.params && route.params.is_auto_focus;

  const {cache_data, cache_snap_data, cache_sync, cache_reset, cache_get, cache_get_snap, cache_set} = useCachedData({
    is_first_refresh: true,
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false,
    fetchers: {}
  });
  
  const user = cache_get(id);
  if (!user) {
    return null;
  }
  
  const snap_user = cache_get_snap(id);
  const { colors } = useTheme();
  
  const load_user = async function() {
    const users = await firestore.fetch_users([id]);
    _.each(users, function(user) {
      useCachedData.cache_set(user);
    });
  };

  useEffect(() => {
    load_user();
    refresh();
  }, []);
  
  const fetch = async function() {
    if (cache_data.is_refreshing || cache_data.is_loading_more || !user.current_post) {
      return;
    }

    const query_args = [collectionGroup($.db, "reactions"), where("parent_id", "==", user.current_post.id), where("kind", "==", "comment"), orderBy("created_at", "desc"), limit(FETCH_SIZE+1)];
    if (cache_data.cursor) {
      query_args.push(startAfter(cache_data.cursor));
    }
    const q_comment = query(...query_args);
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    const comments = [];
    try {
      const snap_comments = await getDocs(q_comment);
      if (!cache_data.cursor) {
        cache_reset();
      }
      
      let docs = snap_comments.docs;
      
      if (_.size(docs) === (FETCH_SIZE + 1)) {
        docs = _.initial(docs);
        cache_data.cursor = _.last(docs);
      } else {
        cache_data.cursor = null;
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
      cache_sync();
      if (route.params && route.params.is_scroll_to_comments && cache_data.is_first_refresh) {
        scroll_to_index(0, 0.2, 400);
      }
      cache_data.is_first_refresh = false;
    } catch (e) {
      $.logger.error(e);
      cache_data.is_loading_more ? cache_data.is_load_more_error = true : cache_data.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.is_loading_more ? cache_data.is_loading_more = false : cache_data.is_refreshing = false;
    }
  };
  
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
  
  const refresh = function() {
    cache_data.cursor = null;
    fetch();
  };
  
  const fetch_more = function() {
    if (!cache_data.cursor) {
      return;
    }
    fetch();
  };
  
  const on_press_retry = function() {
    cache_data.is_refresh_error = false;
    cache_data.is_load_more_error = false;
    fetch();
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  const post_count = _.isNumber(snap_user.post_count) ? snap_user.post_count-1 : 0;
  
  const on_press_settings = function() {
    navigation.push("SettingsStack");
  };
  
  const on_press_contacts = async function() {
    const { status } = await Contacts.requestPermissionsAsync();
    if (!status) {
      $.show_contacts_permissions_dialog();
      return;
    }
    navigation.push("ContactsStack"); 
  };
  
  const on_press_history = function() {
    navigation.push("UserPostListScreen", {screen: "HistoryScreen"}); 
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
      parent_user_id: user.id,
      parent_id: user.current_post.id,
      parent_kind: "post",
      text: comment_text.trim()
    };
    if (cache_data.active_comment_id) {
      params.parent_id = cache_data.active_comment_id;
      params.parent_kind = "reaction";
    }
    set_is_sending_comment(true);
    try {
      const target_index = _.isNumber(cache_data.active_comment_index) ? (cache_data.active_comment_index + 1) : 0;
      const new_comment = await firestore.create_comment(params.parent_user_id, params.parent_id, params.parent_kind, params.text);
      _.isNumber(user.current_post.comment_count) ? user.current_post.comment_count++ : user.current_post.comment_count = 1;
      cache_set(new_comment, { is_skip_pending: true, index: target_index || 0 });
      
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
    delete cache_data.active_comment_id;
    input_focus_target = 0;
    ref_comment_input.current.focus();
  };
  
  const on_press_reply = function(id, index) {
    input_focus_target = index;
    ref_comment_input.current.focus();
    cache_data.active_comment_id = id;
    cache_data.active_comment_index = index;
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
    cache_data.active_comment_index = index;
    fetch_subcomments(id, index);
  };
  
  const on_press_more = function(parent_id, index) {
    fetch_subcomments(parent_id, index);
  };
  
  const render_comment = function(row) {
    if (row.item === "nothing") {
      return <View style={{height: 100}}/>;
    }

    return <Comment id={ row.item } index={ row.index } on_press_reply={on_press_reply} on_press_replies={on_press_replies} is_being_commented_on={cache_snap_data.active_comment_id === row.item} navigation={navigation} state={cache_data.fetchers[row.item]} on_press_more={(cache_data.fetchers[row.item] && cache_data.fetchers[row.item].cursor) ? on_press_more : undefined}/>;
  };
  
  const on_focus = function() {
    cache_data.is_commentbox_has_focus = true;
    scroll_to_index(input_focus_target || 0, 0.5, 400);
  };
  
  const on_blur = function() {
    delete cache_data.active_comment_id;
    delete cache_data.active_comment_index;
    cache_data.is_commentbox_has_focus = false;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'top', 'left']}>
      <Appbar.Header>
        { !is_tabs_screen && (<Appbar.BackAction onPress={on_press_back} />) }
        <Appbar.Content title={snap_user.username}  />
        { id === $.session.uid && (
          <Fragment>
            <View>
              <Appbar.Action icon="clock" onPress={on_press_history} />
              <Badge style={{position: "absolute", backgroundColor: colors.outline}}>{post_count}</Badge>
            </View>
            <Appbar.Action icon="account-group" onPress={on_press_contacts} />
            <Appbar.Action icon="cog" onPress={on_press_settings} />
          </Fragment>
        )}
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <FlatList
          contentContainerStyle={{paddingBottom: 100}}
          ref={ref_list}
          keyboardShouldPersistTaps="never"
          style={{flex: 1}}
          data={_.size(cache_snap_data.data) === 0 ? ["nothing"] : cache_snap_data.data}
          renderItem={render_comment}
          keyExtractor = { item => item }
          ListHeaderComponent = <Header id={id} navigation={navigation} on_press_comment={on_press_comment} on_press_comments={on_press_comments} ref_list={ref_list} is_error={null} on_press_retry={on_press_retry}/>
          ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
          onEndReached={fetch_more}
          removeClippedSubviews={true}
        />
        {_.isObject(snap_user.current_post)  && (
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

export default UserScreen;