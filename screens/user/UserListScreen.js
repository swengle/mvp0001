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
import useGlobalCache from "../../hooks/useGlobalCache";

const FETCH_SIZE = 16;

const empty_list_by_screen = {
  LikersScreen: "No likers found!",
  RequestByScreen: "No requests found!",
  FollowingScreen: "Nobody is following!",
  FollowersScreen: "No followers found!"
};

const title_by_screen = {
  LikersScreen: "Likers",
  RequestByScreen: "Requests",
  FollowingScreen: "Following",
  FollowersScreen: "Followers"
};

const UserListScreen = function({navigation, route}) {
  const { colors } = useTheme();
  
  const toast = useToast();
  const id = route.params.id;
  const screen = route.params.screen;
  
  const { cache_set_users, cache_get_fetcher, cache_get_fetcher_snapshot  } = useGlobalCache();
  const fetcher = cache_get_fetcher(screen + "_" + id);
  const snap_fetcher = cache_get_fetcher_snapshot(screen + "_" + id);
  
  
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
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
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

    if (fetcher.default.cursor) {
      q_args.push(startAfter(fetcher.default.cursor));
    }
    
    const q = query(...q_args);
    
    fetcher.default.cursor ? fetcher.default.is_loading_more = true : fetcher.default.is_refreshing = true;
    try {
      const respone_docs = await getDocs(q);

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
        
        if (fetcher.default.is_refreshing ) {
          fetcher.default.data = cache_set_users(users);
        } else {
          fetcher.default.data = [...fetcher.default.data, ...cache_set_users(users)]; 
        }
      } else if (fetcher.default.is_refreshing) {
        fetcher.default.data = [];
      }
      
      if (_.size(respone_docs.docs) === FETCH_SIZE) {
        fetcher.default.cursor = _.last(respone_docs.docs);
      } else {
        fetcher.default.cursor = null;
      }
    } catch (e) {
      $.logger.error(e);
      fetcher.default.is_loading_more  ? fetcher.default.is_load_more_error = true : fetcher.default.is_refresh_error = true;
      $.display_error(toast, new Error("Something went wrong!"));
    } finally {
      fetcher.default.is_loading_more  ? fetcher.default.is_loading_more = false : fetcher.default.is_refreshing = false;
    }
  };
  
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
  
  const on_request_approve = function(id) {
    fetcher.default.data = _.reject(fetcher.default.data, function(item) {
      return id === item.id;
    });
  };
  
  const on_request_delete = function(id) {
    fetcher.default.data = _.reject(fetcher.default.data, function(item) {
      return id === item.id;
    });
  };

  const render_user = function(row) {
    return <User id={row.item.id} navigation={navigation} on_request_approve={on_request_approve} on_request_delete={on_request_delete} screen={screen}/>;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={title_by_screen[screen]}  />
      </Appbar.Header>
      <FlatList
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={snap_fetcher.default.data}
        renderItem={render_user}
        keyExtractor = { item => item.id }
        ListHeaderComponent = <ListHeader is_error={snap_fetcher.default.is_refresh_error} on_press_retry={on_press_retry}/>
        ListFooterComponent = <ListFooter is_error={snap_fetcher.default.is_load_more_error} is_loading_more={snap_fetcher.default.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty is_refreshing={snap_fetcher.default.is_refreshing} text={empty_list_by_screen[screen]}/>
        refreshControl={
          <RefreshControl
            refreshing={snap_fetcher.default.is_refreshing}
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