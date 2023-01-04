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
import Post from "../components/Post";
import useCachedData from "../hooks/useCachedData";
import firestore from "../firestore/firestore";
import { FlashList } from "@shopify/flash-list";


const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 12;
fetch_sizes_by_number_columns[2] = 16;
fetch_sizes_by_number_columns[3] = 20;
fetch_sizes_by_number_columns[4] = 28;

const PostList = function({ id, screen, navigation, emoji, number_columns, emoji_screen_state, set_emoji_screen_state }) {
  const { colors } = useTheme();
  const [explore_screen_state, set_explore_screen_state] = useState({});

  const {cache_data, cache_snap_data, cache_sync,cache_reset, cache_set} = useCachedData({
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
    if (screen === "DiscoverScreen") {
      query_args = [collection($.db, "posts"), limit(fetch_sizes_by_number_columns[number_columns])];
      if (explore_screen_state.selected_emoji) {
        query_args.push(orderBy("created_at", "desc"));
        query_args.push(where("emoji", "==", explore_screen_state.selected_emoji.char));
      } else if (explore_screen_state.selected_group) {
        query_args.push(orderBy("created_at", "desc"));
        query_args.push(where("emoji_group", "==", explore_screen_state.selected_group.name));
      } else {
        query_args.push(orderBy("emoji_group"));
        query_args.push(where("emoji_group", "!=", ""));
      }
    } else if (screen === "HomeScreen" || screen === "EmojiScreen" || screen == "HistoryScreen") {
      query_args = [collection($.db, "posts"), where("uid", "==", $.session.uid), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    }
    
    
    if (cache_data.cursor ) {
      query_args.push(startAfter(cache_data.cursor));
    }
    
    const q_post = query(...query_args);
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    const posts = [];

    try {
      const snap_posts = await getDocs(q_post);
      if (!cache_data.cursor) {
        cache_reset();
      }
      if (_.size(snap_posts.docs) === fetch_sizes_by_number_columns[number_columns]) {
        cache_data.cursor = _.last(snap_posts.docs);
      } else {
        cache_data.cursor = null;
      }
      _.each(snap_posts.docs, function(doc_post) {
        posts.push(doc_post.data());
      });
      await firestore.inflate_posts({posts: posts}, cache_set);
      cache_sync();
    } catch (e) {
      $.logger.error(e);
      cache_data.is_loading_more ? cache_data.is_load_more_error = true : cache_data.is_refresh_error = true;
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cache_data.is_loading_more ? cache_data.is_loading_more = false : cache_data.is_refreshing = false;
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

  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns} screen={screen}/>;
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <AnimatedFlashList
        ref={ref_list}
        scrollEventThrottle={16}
        onScroll={handle_scroll}
        key={number_columns}
        keyboardShouldPersistTaps="always"
        data={cache_snap_data.data}
        renderItem={render_post}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry} screen={screen} is_refreshing={cache_data.is_refreshing} 
          emoji={emoji} explore_screen_state={explore_screen_state} set_explore_screen_state={set_explore_screen_state}
          emoji_screen_state={emoji_screen_state} set_emoji_screen_state={set_emoji_screen_state}
          />
        ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={cache_snap_data.data} text="No posts found"/>
        refreshControl = {
          (screen === "EmojiScreen" || screen === "DiscoverScreen") ? undefined :
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


export default PostList;