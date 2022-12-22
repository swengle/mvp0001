"use strict";
import $ from "../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../components/ListHeader";
import ListFooter from "../components/ListFooter";
import ListEmpty from "../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import { useTheme } from "react-native-paper";
import UserPost from "../components/UserPost";
import useCachedData from "../hooks/useCachedData";
import firestore from "../firestore/firestore";
import { FlashList } from "@shopify/flash-list";
import Post from "../components/Post";

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 12;
fetch_sizes_by_number_columns[2] = 16;
fetch_sizes_by_number_columns[3] = 20;
fetch_sizes_by_number_columns[4] = 28;

const UserPostList = function({ id, screen, navigation, emoji, number_columns, emoji_screen_state, set_emoji_screen_state }) {
  const { colors } = useTheme();
  const [explore_screen_state, set_explore_screen_state] = useState({segment_value: "users"});

  const {cache_data, cache_snap_data, cache_sync, cache_empty, cache_reset, cache_set} = useCachedData({
    id: id,
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });
  
  const ref_list = useRef();

  const toast = useToast();
  
  const scrollY = useRef(new Animated.Value(0));
  
  useEffect(() => {
    screen === "HomeScreen" && $.check_notification_permissions(); 
    refresh();
  }, []);
  
  useEffect(() => {
    scrollY.current.setValue(0);
  }, [number_columns]);
  
  
  useEffect(() => {
    refresh();
  }, [explore_screen_state]);
  
  
  const fetch = async function() {
    if (cache_data.is_refreshing || cache_data.is_loading_more) {
      return;
    }

    let query_args;
    if (screen === "DiscoveryScreen") {
      query_args = [collection($.db, "users"), where("is_account_public", "==", true), orderBy("current_post_created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
      if (explore_screen_state.selected_emoji) {
        query_args.push(where("current_post_emoji_char", "==", explore_screen_state.selected_emoji.char));
      } else if (explore_screen_state.selected_group) {
        query_args.push(where("current_post_emoji_group", "==", explore_screen_state.selected_group.name));
      }
    } else if (screen == "HistoryScreen") {
      query_args = [collection($.db, "users/" + $.session.uid + "/posts"), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    } else if (screen === "HomeScreen") {
      // this will be from the feed eventually
      query_args = [collection($.db, "users"), orderBy("current_post_created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    } else if (screen === "EmojiScreen") {
      query_args = [collection($.db, "users"), where("current_post_emoji_char", "==", emoji.char), where("is_account_public", "==", true), orderBy("current_post_created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
      if (emoji_screen_state.segment_value === "you") {
        query_args = [collection($.db, "users/" + $.session.uid + "/posts"), where("emoji_char", "==", emoji.char), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
      } else {
        query_args = [collection($.db, "users"), where("current_post_emoji_char", "==", emoji.char), where("is_account_public", "==", true), orderBy("current_post_created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
      }
    }
    
    if (cache_data.cursor ) {
      query_args.push(startAfter(cache_data.cursor));
    }
    
    const q = query(...query_args);
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    const items = [];

    try {
      const snap_docs = await getDocs(q);
      if (!cache_data.cursor) {
        cache_reset();
      }
      const size = _.size(snap_docs.docs);
      if (size === fetch_sizes_by_number_columns[number_columns]) {
        cache_data.cursor = _.last(snap_docs.docs);
      } else {
        cache_data.cursor = null;
      }
      if (size > 0) {
        _.each(snap_docs.docs, function(doc) {
          items.push(doc.data());
        });
        
        if (screen == "HistoryScreen") {
          await firestore.fetch_post_dependencies(items);
        } else {
          await firestore.fetch_user_dependencies(items); 
        }

        _.each(items, function(item) {
          cache_set(item);
        });
        cache_sync();
      } else {
        cache_empty(); 
      }
    } catch (e) {
      $.logger.error(e);
      cache_data.is_loading_more ? cache_data.is_load_more_error = true : cache_data.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.is_loading_more ? cache_data.is_loading_more = false : cache_data.is_refreshing_delayed = cache_data.is_refreshing = false;
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

  const render_user_post = function(row) {
    return (screen === "HistoryScreen" || (screen === "EmojiScreen" && emoji_screen_state.segment_value === "you")) ?  <Post navigation={navigation} id={row.item} number_columns={number_columns} screen={screen}/> : <UserPost navigation={navigation} id={row.item} number_columns={number_columns} screen={screen}/> ;
  };

  const handle_scroll = Animated.event(
    [
      {
        nativeEvent: {
          contentOffset: {y: scrollY.current},
        },
      },
    ],
    {
      useNativeDriver: false,
    },
  );
  
  _.size(cache_snap_data.data);

  return (
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <FlashList
        ref={ref_list}
        scrollEventThrottle={16}
        onScroll={handle_scroll}
        key={number_columns}
        keyboardShouldPersistTaps={explore_screen_state.is_search_active ? "always" : "never"}
        data={explore_screen_state.is_search_active ? undefined : cache_snap_data.data}
        renderItem={render_user_post}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry} screen={screen} is_refreshing={cache_data.is_refreshing} 
          navigation={navigation}
          emoji={emoji} explore_screen_state={explore_screen_state} set_explore_screen_state={set_explore_screen_state}
          emoji_screen_state={emoji_screen_state} set_emoji_screen_state={set_emoji_screen_state}
          />
        ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={explore_screen_state.is_search_active ? undefined : cache_snap_data.data} text="No users found!"/>
        refreshControl = {
          (screen === "EmojiScreen" || screen === "DiscoveryScreen") ? undefined :
          <RefreshControl
            refreshing={cache_snap_data.is_refreshing}
            onRefresh={refresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        onEndReached={fetch_more}
        numColumns={number_columns}
        horizontal={false}
        onEndReachedThreshold={0.75}
        estimatedItemSize={$.const.image_sizes[number_columns].height}
        getItemType={(item) => {
          return "photo";
        }}
        initialNumToRender={24}
        />
    </KeyboardAvoidingView>
  );
};


export default UserPostList;