"use strict";
import $ from "../../setup";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Appbar, Menu, Text } from "react-native-paper";
import GridMenu from "../../components/GridMenu";
import PostList from "../../components/PostList";


const PostListScreen = function({navigation, route}) {
  const screen = (route && route.params) ? route.params.screen : "HomeScreen";
  let id, title, emoji_data;
  if (screen === "HomeScreen") {
    id = screen;
    title = "swengle";
  } else if (screen === "EmojiScreen") {
    emoji_data = $.emoji_data_by_char[route.params.emoji];
    title = <View style={{flexDirection: "row", alignItems: "center", justifyContent: "center"}}><Text style={{fontFamily: "TwemojiMozilla", fontSize: 24}}>{emoji_data.char}</Text><Text variant="titleMedium"> {emoji_data.name}</Text></View>;
  } else if (screen === "DiscoveryScreen") {
    title = "Discovery";
  } else if (screen === "HistoryScreen") {
    id = screen;
    title = "History";
  } else {
    title = screen;
  }
  
  const [number_columns, set_number_columns] = useState($.app[screen + "_number_columns"] || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);
  const [seg_value, set_seg_value] = useState(screen === "EmojiScreen" ? "everyone" : undefined);


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
  
  const on_seg_change = function(value) {
    set_seg_value(value);
  };

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header style={{zIndex: 49}}>
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
      {!seg_value && <PostList id={id} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji_data}/>}
      {seg_value === "everyone" && <PostList id={"emoji-everyone"} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji_data} on_seg_change={on_seg_change} seg_value={seg_value}/>}
      {seg_value === "you" && <PostList id={"emoji-you"} screen={screen} navigation={navigation} number_columns={number_columns} emoji={emoji_data} on_seg_change={on_seg_change} seg_value={seg_value}/>}
    </SafeAreaView>
  );
};


export default PostListScreen;