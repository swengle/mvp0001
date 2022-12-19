"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, RefreshControl } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import { Appbar, Menu, Text, useTheme } from "react-native-paper";
import Post from "../../components/Post";
import useCachedData from "../../hooks/useCachedData";
import firestore from "../../firestore/firestore";
import { FlashList } from "@shopify/flash-list";
import GridMenu from "../../components/GridMenu";

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 16;
fetch_sizes_by_number_columns[2] = 32;
fetch_sizes_by_number_columns[3] = 32;
fetch_sizes_by_number_columns[4] = 32;

const PostListScreen = function({navigation, route}) {
  const screen = (route && route.params) ? route.params.screen : "HomeScreen";
  let id, title, emoji_data;
  if (screen === "HomeScreen") {
    id = screen;
    title = "swengle";
  } else if (screen === "EmojiScreen") {
    emoji_data = $.emoji_data_by_char[route.params.emoji];
    title = <Text><Text style={{fontFamily: "TwemojiMozilla"}}>{emoji_data.char}</Text><Text> {emoji_data.name}</Text></Text>;
  } else if (screen === "DiscoveryScreen") {
    title = "Discovery";
  } else if (screen === "HistoryScreen") {
    id = screen;
    title = "History";
  } else {
    title = screen;
  }
  
  const { colors } = useTheme();
  const [number_columns, set_number_columns] = useState($.app[screen + "_number_columns"] || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);

  const {cache_data, cache_snap_data, cache_sync,cache_reset, cache_set} = useCachedData({
    id: id,
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });

  const toast = useToast();

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
  
  const on_dismiss_gridmenu = function() {
    set_is_gridmenu_visible(false);
  };
  
  const on_press_gridmenu = function() {
    set_is_gridmenu_visible(true);
  };
  
  const on_press_grid = function(num_cols) {
    set_number_columns(num_cols);
    set_is_gridmenu_visible(false);
    $.app[screen + "_number_columns"] = num_cols; 
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns} screen={screen}/>;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        {(screen !== "HomeScreen" && screen !== "DiscoveryScreen") && <Appbar.BackAction onPress={on_press_back} />}
        <Appbar.Content title={title} />
        <Menu
          anchorPosition="bottom"
          visible={is_gridmenu_visible}
          onDismiss={on_dismiss_gridmenu}
          anchor={<Appbar.Action icon="view-grid" onPress={on_press_gridmenu}/>}>
          <GridMenu on_press_grid={on_press_grid}/>
        </Menu>
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <FlashList
          key={number_columns}
          keyboardShouldPersistTaps="always"
          data={cache_snap_data.data}
          renderItem={render_post}
          keyExtractor = { item => item }
          ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry} screen={screen}/>
          ListFooterComponent = <ListFooter is_error={cache_snap_data.is_load_more_error} is_loading_more={cache_snap_data.is_loading_more} on_press_retry={on_press_retry}/>
          ListEmptyComponent = <ListEmpty data={cache_snap_data.data} text="No posts found"/>
          refreshControl={
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
    </SafeAreaView>
  );
};


export default PostListScreen;