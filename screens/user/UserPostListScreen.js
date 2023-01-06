"use strict";
import $ from "../../setup";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from "react-native";
import { Appbar, Menu, Text } from "react-native-paper";
import GridMenu from "../../components/GridMenu";
import UserPostList from "../../components/UserPostList";
import { useSnapshot } from "valtio";

const UserPostListScreen = function({navigation, route}) {
  const snap_session = useSnapshot($.session);
  const screen = (route && route.params) ? route.params.screen : "HomeScreen";
  let id, title, emoji;
  if (screen === "HomeScreen") {
    id = screen;
    title = "swengle";
  } else if (screen === "EmojiScreen") {
    emoji = $.emoji_data_by_char[route.params.emoji];
    title = <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center"}}><Text style={{fontFamily: "TwemojiMozilla", fontSize: 24}}>{emoji.char}</Text><Text variant="titleMedium"> {emoji.name}</Text></View>;
  } else if (screen === "DiscoverScreen") {
    title = "Discover";
  } else if (screen === "HistoryScreen") {
    id = screen;
    title = "History";
  } else if (screen === "LocationScreen") {
    id = route.params.id;
    title = route.params.title;
  } else {
    title = screen;
  }
  
  const [number_columns, set_number_columns] = useState($.app[screen + "_number_columns"] || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);
  const [emoji_screen_state, set_emoji_screen_state] = useState(screen === "EmojiScreen" ? {segment_value: "everyone" } : {});

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

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      {!(screen === "DiscoverScreen" && snap_session.is_discover_search_active) && (
        <Appbar.Header>
          {(screen !== "HomeScreen" && screen !== "DiscoverScreen") && <Appbar.BackAction onPress={on_press_back} />}
          <Appbar.Content title={title} />
          {screen === "DiscoverScreen" && (
            <Appbar.Action icon="magnify" onPress={on_press_search}/>
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
      {!emoji_screen_state.segment_value && <UserPostList id={id} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji}/>}
      {emoji_screen_state.segment_value === "everyone" && <UserPostList id={"emoji-everyone"} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji} set_emoji_screen_state={set_emoji_screen_state} emoji_screen_state={emoji_screen_state}/>}
      {emoji_screen_state.segment_value === "you" && <UserPostList id={"emoji-you"} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji} set_emoji_screen_state={set_emoji_screen_state} emoji_screen_state={emoji_screen_state}/>}
    </SafeAreaView>
  );
};


export default UserPostListScreen;