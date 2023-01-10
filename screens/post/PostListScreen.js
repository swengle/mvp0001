"use strict";
import $ from "../../setup";
import { Fragment, useEffect, useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from "react-native";
import { Appbar, Menu, Text } from "react-native-paper";
import GridMenu from "../../components/GridMenu";
import PostList from "../../components/PostList";
import { useSnapshot } from "valtio";
import useGlobalCache from "../../hooks/useGlobalCache";
import firestore from "../../firestore/firestore";
import * as Contacts from 'expo-contacts';

const PostListScreen = function({navigation, route}) {
  const snap_session = useSnapshot($.session);
  const screen = (route && route.params) ? route.params.screen : "HomeScreen";
  let id, title, emoji, is_tabs_screen;
  if (screen === "UserScreen") {
    if (route.params && route.params.id) {
      id = route.params.id;
      is_tabs_screen = false;
    } else {
      id = $.session.uid;
      is_tabs_screen = true;
    }
  } else if (screen === "HomeScreen") {
    id = screen;
    title = "swengle";
  } else if (screen === "EmojiScreen") {
    emoji = $.emoji_data_by_char[route.params.emoji];
    title = <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center"}}><Text style={{fontFamily: "TwemojiMozilla", fontSize: 24}}>{emoji.char}</Text><Text variant="titleMedium"> {emoji.name}</Text></View>;
  } else if (screen === "DiscoverScreen") {
    title = "Discover";
  } else if (screen === "LocationScreen") {
    id = route.params.id;
    title = route.params.title;
  } else {
    title = screen;
  }
  
  const { cache_set_users, cache_get_snapshot } = useGlobalCache();
  const snap_user = screen === "UserScreen" ? cache_get_snapshot(id) : undefined; 
  
  const load_user = async function() {
    const users = await firestore.fetch_users([id]);
    cache_set_users(users);
  };
  
  useEffect(() => {
    if (screen === "USerScreen") {
      load_user(); 
    }
  }, []);
  
  const [number_columns, set_number_columns] = useState($.app[screen + "_number_columns"] || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);

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
  
  const on_press_search = function() {
    navigation.push("SearchScreen");
  };
  
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

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      {!(screen === "DiscoverScreen" && snap_session.is_discover_search_active) && (
        <Appbar.Header>
          {(screen !== "HomeScreen" && screen !== "DiscoverScreen" && !is_tabs_screen) && <Appbar.BackAction onPress={on_press_back} />}
          <Appbar.Content title={screen === "UserScreen" ? snap_user.username : title} />
          {screen === "DiscoverScreen" && (
            <Appbar.Action icon="magnify" onPress={on_press_search}/>
          )}
          {screen === "UserScreen" && id === $.session.uid &&  (
            <Fragment>
              <Appbar.Action icon="account-group" onPress={on_press_contacts} />
              <Appbar.Action icon="cog" onPress={on_press_settings} />
            </Fragment>
          )}
          
          <Menu
            anchorPosition="bottom"
            visible={is_gridmenu_visible}
            onDismiss={on_dismiss_gridmenu}
            anchor={<Appbar.Action icon="view-grid" onPress={on_press_gridmenu}/>}>
            <GridMenu on_press_grid={on_press_grid}/>
          </Menu>
        </Appbar.Header>
      )}
      <PostList id={id} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji} coordinate={route.params ? route.params.coordinate : undefined}/>
    </SafeAreaView>
  );
};


export default PostListScreen;