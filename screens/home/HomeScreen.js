"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, KeyboardAvoidingView, Platform, RefreshControl, View } from "react-native";
import { useToast } from "react-native-toast-notifications";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import { collection, getDocs, limit, query, startAfter, where, orderBy } from "firebase/firestore";
import { Appbar, Divider, Menu, TouchableRipple, useTheme } from "react-native-paper";
import Post from "../../components/Post";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useCachedData from "../../hooks/useCachedData";
import { useSnapshot } from "valtio";

const fetch_sizes_by_number_columns = {};
fetch_sizes_by_number_columns[1] = 8;
fetch_sizes_by_number_columns[2] = 12;
fetch_sizes_by_number_columns[3] = 15;
fetch_sizes_by_number_columns[4] = 24;

const HomeScreen = function({navigation, route}) {
  const { colors } = useTheme();
  const [number_columns, set_number_columns] = useState($.app.home_number_columns || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);

  const cached_data = useCachedData($);
  const snap_cached_data = useSnapshot(cached_data);

  // common states for an infinite load page
  const [cursor, set_cursor] = useState();
  const [is_refreshing, set_is_refreshing] = useState(false);
  const [is_refresh_error, set_is_refresh_error ] = useState(false);
  const [is_load_more_error, set_is_load_more_error] = useState(false);
  const [is_loading_more, set_is_loading_more] = useState(false);
  
  const toast = useToast();

  useEffect(() => {
    $.check_notification_permissions(); 
    refresh();
  }, []);
  
  
  const fetch = async function(cursor) {
    if (is_refreshing || is_loading_more) {
      return;
    }
    const query_args = [collection($.db, "post"), where("uid", "==", $.session.uid), orderBy("created_at", "desc"), limit(fetch_sizes_by_number_columns[number_columns])];
    if (cursor) {
      query_args.push(startAfter(cursor));
    }
    const q_post = query(...query_args);
    cursor ? set_is_loading_more(true) : set_is_refreshing(true);
    let rows = [];
    try {
      const snap_posts = await getDocs(q_post);
      _.each(snap_posts.docs, function(doc_post) {
        const post = doc_post.data();
        $.cache.set(post);
        rows.push(post.id);
      });
      if (cursor) {
        cached_data.data = cached_data.data.concat(rows);
      } else {
        cached_data.data = rows;
      }
      if (_.size(rows) === fetch_sizes_by_number_columns[number_columns]) {
        set_cursor(_.last(snap_posts.docs));
      } else {
        set_cursor(null);
      }
    } catch (e) {
      cursor ? set_is_load_more_error(true) : set_is_refresh_error(true);
      $.display_error(toast, new Error("Failed to load users."));
    } finally {
      cursor ? set_is_loading_more(false) : set_is_refreshing(false);
    }
  };

  const refresh = function() {
    fetch();
  };
  
  const fetch_more = async function() {
    if (!cursor) {
      return;
    }
    await fetch(cursor);
  };
  
  const on_press_retry = async function() {
    if (cursor) {
      await refresh();
    } else {
      await fetch(cursor);
    }
  };
  
  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns}/>;
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
    $.app.home_number_columns = 1;
  };
  
  const on_press_grid_2 = function() {
    set_number_columns(2);
    set_is_gridmenu_visible(false);
    $.app.home_number_columns = 2;
  };
  
  const on_press_grid_3 = function() {
    set_number_columns(3);
    set_is_gridmenu_visible(false);
    $.app.home_number_columns = 3;
  };
  
  const on_press_grid_4 = function() {
    set_number_columns(4);
    set_is_gridmenu_visible(false);
    $.app.home_number_columns = 4;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.Content title="Swengle" />
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
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <FlatList
          key={number_columns}
          style={{flex: 1}}
          keyboardShouldPersistTaps="always"
          data={snap_cached_data.data}
          renderItem={render_post}
          keyExtractor = { item => item }
          ListHeaderComponent = <ListHeader is_error={is_refresh_error} on_press_retry={on_press_retry}/>
          ListFooterComponent = <ListFooter is_error={is_load_more_error} is_loading_more={is_loading_more} on_press_retry={on_press_retry}/>
          ListEmptyComponent = <ListEmpty data={snap_cached_data.data} text="No posts found"/>
          refreshControl={
            <RefreshControl
              refreshing={is_refreshing}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default HomeScreen;