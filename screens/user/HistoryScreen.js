"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, RefreshControl, View } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import { Appbar, Divider, Menu, TouchableRipple, useTheme } from "react-native-paper";
import Post from "../../components/Post";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useCachedData from "../../hooks/useCachedData";
import firestore from "../../firestore/firestore";

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 8;
fetch_sizes_by_number_columns[2] = 12;
fetch_sizes_by_number_columns[3] = 15;
fetch_sizes_by_number_columns[4] = 24;

const HistoryScreen = function({navigation, route}) {
  const { colors } = useTheme();
  const [number_columns, set_number_columns] = useState($.app.history_number_columns || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);
  
  const {cache_data, cache_snap_data, cache_sync, cache_reset, cache_set} = useCachedData({
    id: "history",
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });
  
  const toast = useToast();

  useEffect(() => {
    refresh();
  }, []);
  
  
  const fetch = async function(cursor) {
    if (cache_data.is_refreshing || cache_data.is_loading_more) {
      return;
    }
    const query_args = [collection($.db, "post"), where("uid", "==", $.session.uid), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    if (cache_data.cursor) {
      query_args.push(startAfter(cache_data.cursor));
    }
    const q_post = query(...query_args);
    cache_data.cursor ? cache_data.is_loading_more = true : cache_data.is_refreshing = true;
    const posts = [];
    try {
      if (!cache_data.cursor) {
        cache_reset();
      }
      const snap_posts = await getDocs(q_post);
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
      console.log(e);
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
    fetch();
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns} is_history_screen={true}/>;
  };
  
  const on_dismiss_gridmenu = function() {
    set_is_gridmenu_visible(false);
  };
  
  const on_press_gridmenu = function() {
    set_is_gridmenu_visible(true);
  };
  
  const on_press_grid_1 = function() {
    set_number_columns(1);
    set_is_gridmenu_visible(false);
    $.app.history_number_columns = 1;
  };
  
  const on_press_grid_2 = function() {
    set_number_columns(2);
    set_is_gridmenu_visible(false);
    $.app.history_number_columns = 2;
  };
  
  const on_press_grid_3 = function() {
    set_number_columns(3);
    set_is_gridmenu_visible(false);
    $.app.history_number_columns = 3;
  };
  
  const on_press_grid_4 = function() {
    set_number_columns(4);
    set_is_gridmenu_visible(false);
    $.app.history_number_columns = 4;
  };
  
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="History" />
        <Menu
          anchorPosition="bottom"
          visible={is_gridmenu_visible}
          onDismiss={on_dismiss_gridmenu}
          anchor={<Appbar.Action icon="view-grid" onPress={on_press_gridmenu}/>}>
          <View>
            <TouchableRipple onPress={on_press_grid_1}>
              <View style={{flexDirection: "row", padding: 10, paddingVertical: 20}}>
                <MaterialCommunityIcons name={"square"} color={colors.text}/>
              </View>
            </TouchableRipple>
            <Divider/>
            <TouchableRipple onPress={on_press_grid_2}>
              <View style={{padding: 10, paddingVertical: 20}}>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
              </View>
            </TouchableRipple>
            <Divider/>
            <TouchableRipple onPress={on_press_grid_3}>
              <View style={{padding: 10, paddingVertical: 20}}>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
              </View>
            </TouchableRipple>
            <Divider/>
            <TouchableRipple onPress={on_press_grid_4}>
              <View style={{padding: 10, paddingVertical: 20}}>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
                <View style={{flexDirection: "row"}}>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                  <MaterialCommunityIcons name={"square"} color={colors.text}/>
                </View>
              </View>
            </TouchableRipple>
          </View>
        </Menu>
      </Appbar.Header>
      <FlatList
        key={number_columns}
        style={{flex: 1}}
        keyboardShouldPersistTaps="always"
        data={cache_snap_data.data}
        renderItem={render_post}
        keyExtractor = { item => item }
        ListHeaderComponent = <ListHeader is_error={cache_snap_data.is_refresh_error} on_press_retry={on_press_retry}/>
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
        removeClippedSubviews={true}
        numColumns={number_columns}
        horizontal={false}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
};


export default HistoryScreen;