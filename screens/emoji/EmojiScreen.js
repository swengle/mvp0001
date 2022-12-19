"use strict";
import $ from "../../setup.js";
import { useState } from "react";
import { RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Menu, useTheme } from "react-native-paper";
import NotFound from "../../components/NotFound";
import useCachedData from "../../hooks/useCachedData";
import GridMenu from "../../components/GridMenu";
import { FlashList } from "@shopify/flash-list";
import ListHeader from "../../components/ListHeader";
import ListFooter from "../../components/ListFooter";
import ListEmpty from "../../components/ListEmpty";
import Post from "../../components/Post";

function EmojiScreen({ navigation, route }) {
  const { colors } = useTheme();
  const emoji = (route && route.params) ? route.params.emoji : undefined;
  const [number_columns, set_number_columns] = useState($.app.home_number_columns || 3);
  const [is_gridmenu_visible, set_is_gridmenu_visible] = useState(false);
  
  let emoji_data;
  if (emoji) {
    emoji_data = $.emoji_data_by_char[emoji];
  }
  
  const {cache_data, cache_snap_data, cache_sync, cache_reset, cache_set} = useCachedData({
    id: "home",
    is_refreshing: false,
    is_refresh_error: false,
    is_load_more_error: false,
    is_loading_more: false
  });
  
  const on_press_back = function() {
    navigation.goBack();    
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
    $.app.home_number_columns = 4;
  };
  
  const render_post = function(row) {
    return <Post navigation={navigation} id={row.item} number_columns={number_columns}/>;
  };
  
  const on_press_retry = function() {
    
  };
  
  const refresh = function() {
    
  };
  
  return (
      <SafeAreaView style ={{flex: 1}} edges={['top', 'right', 'left']}>
        <Appbar.Header>
          <Appbar.BackAction onPress={on_press_back} />
          <Appbar.Content title={emoji_data && <Text><Text style={{fontFamily: "TwemojiMozilla"}}>{emoji_data.char}</Text><Text> {emoji_data.name}</Text></Text>} />
          <Menu
            anchorPosition="bottom"
            visible={is_gridmenu_visible}
            onDismiss={on_dismiss_gridmenu}
            anchor={<Appbar.Action icon="view-grid" onPress={on_press_gridmenu}/>}>
            <GridMenu on_press_grid={on_press_grid}/>
          </Menu>
        </Appbar.Header>
        {!emoji && <NotFound/>}
        {emoji && (
          <View style={{flex: 1, alignItems: "center", justifyContent: "center"}}>
            <Text style={{fontFamily: "TwemojiMozilla", fontSize: 200}}>{emoji}</Text>
          </View>
        )}
         <FlashList
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
          //onEndReached={fetch_more}
          numColumns={number_columns}
          horizontal={false}
          onEndReachedThreshold={0.75}
          estimatedItemSize={$.const.image_sizes[number_columns].height}
          getItemType={(item) => {
            return "photo";
          }}
          initialNumToRender={24}
        />
      </SafeAreaView>
    );
  }

export default EmojiScreen;
