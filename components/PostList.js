"use strict";
import $ from "../setup";
import _ from "underscore";
import { useEffect, useRef, useState } from "react";
import { Animated, AppState, KeyboardAvoidingView, Platform, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../components/ListHeader";
import ListFooter from "../components/ListFooter";
import ListEmpty from "../components/ListEmpty";
import { collection, collectionGroup, getDocs, limit, query, startAfter, where, onSnapshot, orderBy } from "firebase/firestore";
import { useTheme } from "react-native-paper";
import firestore from "../firestore/firestore";
import { FlashList } from "@shopify/flash-list";
import Post from "../components/Post";
import useGlobalCache from "../hooks/useGlobalCache";

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 12;
fetch_sizes_by_number_columns[2] = 16;
fetch_sizes_by_number_columns[3] = 20;
fetch_sizes_by_number_columns[4] = 28;

const empty_list_by_screen = {
  HomeScreen: "Your friends updates will appear live here. Make sure to add friends to see what they are feeling!",
  LocationScreen: "Nobody is feeling anything here it seems!",
  DiscoverScreen: "Nothing to discover yet!",
  HistoryScreen: "You haven't made an posts yet!",
  EmojiScreen: "Nobody is feeling this right now. At least not publicly!"
};

const PostList = function({ id, screen, navigation, emoji, number_columns, emoji_screen_state, set_emoji_screen_state }) {
  const { colors } = useTheme();
  const [explore_screen_state, set_explore_screen_state] = useState({segment_value: "users"});
  const { cache_set_posts, cache_get_fetcher, cache_get_fetcher_snapshot  } = useGlobalCache();
  
  let fetcher_id = screen;
  if (screen === "EmojiScreen") {
    fetcher_id += emoji.char;
  } else if (screen === "LocationScreen") {
    fetcher_id += id;
  }
  
  const fetcher = cache_get_fetcher(fetcher_id);
  const snap_fetcher = cache_get_fetcher_snapshot(fetcher_id);
  
  const ref_list = useRef();
  const toast = useToast();

  const scrollY = useRef(new Animated.Value(0));
  
  
  const sync = async function() {
    $.timeline_subscription && $.timeline_subscription();
    const q = query(collection($.db, "users/" + $.session.uid + "/timeline"), limit(5));
    let is_first_time = true;
    // TODO this can be part of the fetch below, being lazy for now but one query would be better than 2
    $.timeline_subscription = onSnapshot(q, function(snapshot) {
      if (is_first_time) {
        is_first_time = false;
        return;
      }
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "removed") {
          const doc = change.doc.data();
          fetcher.default.data = _.reject(fetcher.default.data, function(item) {
            return item.id === doc.post_id;
          });
        } else if (change.type === "added") {
          const doc = change.doc.data();
          const is_already_exists = _.find(fetcher.default.data, function(d) {
            return d.id === doc.post_id;
          });
          if (is_already_exists) {
            return;
          }
          const posts = await firestore.fetch_posts([doc.post_id]);
          const post = posts[0];
          if (post) {
            let data = fetcher.default.data ? fetcher.default.data : [];
            data.push(cache_set_posts(post));
            data = _.sortBy(data, function(d) {
              return d.created_at_time;
            });
            fetcher.default.data = data;
          }
        }
      });
    });
    refresh();
  };
  
  useEffect(() => {
    if (screen === "HomeScreen") {
      $.timeline_appstate_subscription = AppState.addEventListener("change", function(next_app_state) {
        if (next_app_state === "active") {
          sync();
        } else {
          $.timeline_subscription && $.timeline_subscription();
        }
      });
      sync();
      $.check_notification_permissions();
      return function() {
        $.timeline_subscription && $.timeline_subscription();
        $.timeline_appstate_subscription && $.timeline_appstate_subscription.remove();
      };
    } else if (screen !== "DiscoverScreen") {
      refresh();
    }
  }, []);
  
  useEffect(() => {
    scrollY.current.setValue(0);
  }, [number_columns]);
  
  
  useEffect(() => {
    refresh();
  }, [explore_screen_state]);
  
  const fetch = async function() {
    if (fetcher.default.is_refreshing || fetcher.default.is_loading_more) {
      return;
    }

    let query_args;
    if (screen === "DiscoverScreen") {
      query_args = [collectionGroup($.db, "posts"), where("is_current", "==", true), where("is_account_public", "==", true), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
      if (explore_screen_state.selected_emoji) {
        query_args.push(where("emoji_char", "==", explore_screen_state.selected_emoji.char));
      } else if (explore_screen_state.selected_group) {
        query_args.push(where("emoji_group", "==", explore_screen_state.selected_group.name));
      }
    } else if (screen == "UserScreen") {
      query_args = [collection($.db, "users/" + id + "/posts"), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    } else if (screen === "EmojiScreen") {
      query_args = [collectionGroup($.db, "posts"), where("emoji_char", "==", emoji.char), where("is_current", "==", true), where("is_account_public", "==", true), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    } else if (screen === "LocationScreen") {
      query_args = [collectionGroup($.db, "posts"), where("location_id", "==", id), where("is_current", "==", true), where("is_account_public", "==", true), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    } else if (screen === "HomeScreen") {
      query_args = [collection($.db, "users/" + $.session.uid + "/timeline"), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    }
    
    
    let posts = [];
    
    if (fetcher.default.cursor) {
      fetcher.default.is_loading_more = true;
      fetcher.default.is_refreshing = false;
    } else {
      fetcher.default.is_refreshing = true;
      fetcher.default.is_loading_more = false;
    }
    
    try {
      let data;
      if (fetcher.default.cursor) {
        query_args.push(startAfter(fetcher.default.cursor));
      }
      const q = query(...query_args);
      const snap_docs = await getDocs(q);
      const size = _.size(snap_docs.docs);
      
      if (size === fetch_sizes_by_number_columns[number_columns]) {
        fetcher.default.cursor = _.last(snap_docs.docs);
      } else {
        fetcher.default.cursor = null;
      }
      if (size > 0) {
        if (screen === "HomeScreen") {
          const post_ids = [];
          _.each(snap_docs.docs, function(doc) {
            post_ids.push(doc.data().post_id);
          });
          posts = await firestore.fetch_posts(post_ids);
        } else {
          _.each(snap_docs.docs, function(doc) {
            posts.push(doc.data());
          }); 
        }
        await firestore.fetch_post_dependencies(posts);
        data = cache_set_posts(posts);
        
      } else if (fetcher.default.is_refreshing) {
        data = [];
      }
      if (fetcher.default.is_refreshing) {
        fetcher.default.data = data;
      } else {
        fetcher.default.data = [...fetcher.default.data, ...data];
      }
    } catch (e) {
      $.logger.error(e);
      fetcher.default.is_loading_more ? fetcher.default.is_load_more_error = true : fetcher.default.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      fetcher.default.is_loading_more ? fetcher.default.is_loading_more = false : fetcher.default.is_refreshing = false; 
    }
  };
  
  const update_explore_counts = async function() {
    $.session.global_counts = (await $.cf.get_global_counts()).data;
  };

  const refresh = function() {
    if (screen === "DiscoverScreen") {
      update_explore_counts();
    }
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

  const render_user_post = function(row) {
    return <Post navigation={navigation} id={row.item.id} number_columns={number_columns} screen={screen}/>;
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
  
  _.size(snap_fetcher.default.data);

  return (
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
      <FlashList
        ref={ref_list}
        scrollEventThrottle={16}
        onScroll={handle_scroll}
        key={number_columns}
        keyboardShouldPersistTaps={explore_screen_state.is_search_active ? "always" : "never"}
        data={explore_screen_state.is_search_active ? undefined : snap_fetcher.default.data}
        renderItem={render_user_post}
        keyExtractor = { item => item.id }
        ListHeaderComponent = <ListHeader id={id} is_error={snap_fetcher.default.is_refresh_error} on_press_retry={on_press_retry} screen={screen} is_refreshing={snap_fetcher.default.is_refreshing} 
          navigation={navigation}
          emoji={emoji} explore_screen_state={explore_screen_state} set_explore_screen_state={set_explore_screen_state}
          />
        ListFooterComponent = <ListFooter is_error={snap_fetcher.default.is_load_more_error} is_loading_more={snap_fetcher.default.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty text={empty_list_by_screen[screen] || "No posts found!"} is_refreshing={snap_fetcher.default.is_refreshing}/>
        refreshControl = {
          <RefreshControl
            refreshing={snap_fetcher.default.is_refreshing}
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
        initialNumToRender={24}
        />
    </KeyboardAvoidingView>
  );
};


export default PostList;