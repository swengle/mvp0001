"use strict";
import $ from "../setup";
import _ from "underscore";
import { useEffect, useRef } from "react";
import { Animated, KeyboardAvoidingView, Platform, RefreshControl, View } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../components/ListHeader";
import ListFooter from "../components/ListFooter";
import ListEmpty from "../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import { ActivityIndicator, SegmentedButtons, useTheme } from "react-native-paper";
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

const PostList = function({ id, screen, navigation, emoji, number_columns, on_seg_change, seg_value }) {
  const { colors } = useTheme();

  const {cache_data, cache_snap_data, cache_sync,cache_reset, cache_set} = useCachedData({
    id: id,
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });

  const toast = useToast();
  
  const scrollY = useRef(new Animated.Value(0));
  
  useEffect(() => {
    screen === "HomeScreen" && $.check_notification_permissions(); 
    refresh();
  }, []);
  
  const fetch = async function() {
    if (cache_data.is_refreshing || cache_data.is_loading_more) {
      return;
    }

    let query_args;
    if (screen === "HomeScreen" || screen === "DiscoveryScreen" || screen === "EmojiScreen" || screen == "HistoryScreen") {
      query_args = [collection($.db, "post"), where("uid", "==", $.session.uid), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
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
      await firestore.inflate_posts({
        posts: posts
      }, cache_set);
      cache_sync();
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

  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns} screen={screen}/>;
  };
  
  const local_on_seg_change = function(value) {
    _.isFunction(on_seg_change) && on_seg_change(value);
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

  
  let translateY = scrollY.current.interpolate({
		inputRange: [0, 60],
		outputRange: [0, -60],
		extrapolate: 'clamp'
	});

  
  return (
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <AnimatedFlashList
        contentContainerStyle={{paddingTop: screen === "EmojiScreen" ? 60 : 0}}
        scrollEventThrottle={16}
        onScroll={handle_scroll}
        key={number_columns}
        keyboardShouldPersistTaps="always"
        data={cache_snap_data.data}
        renderItem={render_post}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry} screen={screen}/>
        ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
        ListEmptyComponent = <ListEmpty data={cache_snap_data.data} text="No posts found"/>
        refreshControl = {
          (screen === "EmojiScreen") ? undefined :
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
      {screen === "EmojiScreen" && (
        <Animated.View style={{flexDirection: "row", position: 'absolute', zIndex: 99, width: "100%", alignItems: "center", transform: [{translateY}]}}>
          <View style={{flex: 1}}/>
          <SegmentedButtons
            value={seg_value}
            onValueChange={local_on_seg_change}
            buttons={[
              {
                icon: "account-multiple",
                value: 'everyone',
                label: 'Everyone (22)',
              },
              {
                icon: "account",
                value: 'you',
                label: 'You (0)',
              }
            ]}
          />
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
            { cache_data.is_refreshing && <ActivityIndicator/> }
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};


export default PostList;