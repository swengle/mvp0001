"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import User from "../../components/User";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collectionGroup, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { Appbar, useTheme } from "react-native-paper";
import firestore from "../../firestore/firestore";
import useCachedData from "../../hooks/useCachedData";

const FETCH_SIZE = 16;

const empty_list_by_screen = {
  LikersScreen: "No likers found!",
  RequestByScreen: "No requests found!",
  FollowingScreen: "Nobody is following!",
  FollowerScreen: "No followers found!"
};

const UserListScreen = function({navigation, route}) {
  const { colors } = useTheme();
  
  const {cache_data, cache_snap_data, cache_sync, cache_empty, cache_reset, cache_set, cache_unset} = useCachedData({
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });
  
  const toast = useToast();
  const id = route.params.id;
  const screen = route.params.screen;
  
  const clear_unread_request_by_count = async function() {
    try {
      await firestore.clear_unread_request_by_count();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (screen === "RequestByScreen") {
      clear_unread_request_by_count(); 
    }
    refresh();
  }, []);
  
  const fetch = async function(cursor) {
    if (cache_data.is_refreshing || cache_data.is_loading_more) {
      return;
    }
    let q_args;
    if (screen === "LikersScreen") {
      q_args = [collectionGroup($.db, "reactions"), where("parent_id", "==", id), where("parent_id", "==", id), where("is_liked", "==", true), orderBy("updated_at", "desc"), limit(FETCH_SIZE)];
    } else {
      q_args = [collectionGroup($.db, "relationships"), orderBy("updated_at", "desc"), limit(FETCH_SIZE)];
      if (screen === "FollowingScreen") {
        q_args.push(where("id", "==", id));
        q_args.push(where("status", "==", "follow"));
      } else if (screen === "FollowersScreen") {
        q_args.push(where("uid", "==", id));
        q_args.push(where("status", "==", "follow"));
      } else if (screen === "RequestByScreen") {
        q_args.push(where("uid", "==", $.session.uid));
        q_args.push(where("status", "==", "request"));
      }
    }

    if (cache_data.cursor) {
      q_args.push(startAfter(cache_data.cursor));
    }
    
    const q = query(...q_args);
    
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    try {
      const respone_docs = await getDocs(q);
      
      if (!cache_data.cursor) {
        cache_reset();
      }
      const data = [];
      _.each(respone_docs.docs, function(doc) {
        data.push(doc.data());
      });

      if (_.size(data)) {
        let user_ids;
        if (screen === "FollowingScreen") {
          user_ids = _.pluck(data, "uid");
        } else if (screen === "FollowersScreen") {
          user_ids = _.pluck(data, "id");
        } else if (screen === "LikersScreen") {
          user_ids = _.pluck(data, "uid");
        } else if (screen === "RequestByScreen") {
          user_ids = _.pluck(data, "id");
        }

        const users = await firestore.fetch_users(user_ids);
        _.each(users, function(user) {
          cache_set(user);
        });
      } else if (cache_data.is_refreshing) {
        cache_empty();
      }
      
      if (_.size(respone_docs.docs) === FETCH_SIZE) {
        cache_data.cursor = _.last(respone_docs.docs);
      } else {
        cache_data.cursor = null;
      }
      cache_sync();
    } catch (e) {
      $.logger.error(e);
      cache_data.is_loading_more  ? cache_data.is_load_more_error = true : cache_data.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.is_loading_more  ? cache_data.is_loading_more = false : cache_data.is_refreshing = false;
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
  
  const on_request_approve = function(id) {
    cache_unset(id);
  };
  
  const on_request_delete = function(id) {
    cache_unset(id);
  };

  const render_user = function(row) {
    return <User id={row.item} navigation={navigation} on_request_approve={on_request_approve} on_request_delete={on_request_delete} screen={screen}/>;
  };
  
  let title;
  if (screen === "FollowingScreen") {
    title = "Following";
  } else if (screen === "FollowersScreen") {
    title = "Followers";
  } else if (screen === "LikersScreen") {
    title = "Likers";
  } else if (screen === "RequestByScreen") {
    title = "Requests";
  }
  
  const empty_message = "No users found!";
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={title}  />
      </Appbar.Header>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={cache_snap_data.data}
        renderItem={render_user}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty is_refreshing={cache_data.is_refreshing} text={empty_list_by_screen[screen]}/>
        refreshControl={
          <RefreshControl
            refreshing={cache_snap_data.is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        onEndReached={fetch_more}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
};


export default UserListScreen;