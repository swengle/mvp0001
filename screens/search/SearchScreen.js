"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useRef, useState } from "react";
import { View } from 'react-native';
import { Appbar, Avatar, Divider, Searchbar, SegmentedButtons, Text, useTheme } from "react-native-paper";
import approx from "approximate-number";
import TouchableOpacity  from "../../components/TouchableOpacity";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useSearch from "../../hooks/useSearch";
import EmojiSearchResult from "../../components/EmojiSearchResult";
import { FlashList } from "@shopify/flash-list";
import { useKeyboard } from "@react-native-community/hooks";
import { SafeAreaView } from 'react-native-safe-area-context';

const SearchResult = function({navigation, row}) {
  const { colors } = useTheme();
  
  if (row.item.username) {
    const user = row.item;
    
    const on_press_user = function() {
      navigation.push("UserScreen", {id: user.id});
    };
    
    return (
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={40} source={{uri: user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleMedium">{user.username}</Text>
            {user.name && <Text variant="bodySmall">{user.name}</Text>}
            {row && row.contact_name && <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else if (row.item.char) {
    return <EmojiSearchResult emoji={row.item} navigation={navigation}/>;
  }
};

const EmojiGroupButton = function({group, on_press, is_disabled, is_selected}) {
  const { colors } = useTheme();
  
  const local_on_press = function() {
    on_press(group);
  };
  
  const count = $.session.global_counts[group.name];
  if (!count) {
    return null;
  }
  
  return (
    <TouchableOpacity onPress={local_on_press} disabled={is_disabled} style={{flex: 1, alignItems: "center"}}> 
      <MaterialCommunityIcons name={group.icon} color={is_selected ? colors.primary : colors.outline} size={40}/>
      <Text style={{color: colors.secondary, fontSize: 12}}>{approx(count)}</Text>
    </TouchableOpacity>
  );
};


const SearchScreen = function({ navigation }) {
  const ref_explore_searchbar = useRef();
  const { search_data, search_users, search_emojis, search_clear } = useSearch();
  const keyboard = useKeyboard();
  
  const [searchbar_text, set_searchbar_text] = useState("");
  const [segment_value, set_segment_value] = useState("users");

  
  const local_on_searchbar_change_text = function(text) {
    set_searchbar_text(text);
    const search_text = text.trim();
    do_search(search_text);
  };
  
  const do_search = _.debounce(function(search_text) {
    if (segment_value === "users") {
      search_users(search_text);
    } else if (segment_value === "emojis") {
      search_emojis(search_text);
    }
  }, 150);
  
  
  const on_press_cancel_searching = function() {
    search_clear();
    set_searchbar_text("");
    ref_explore_searchbar.current.blur();
  };
  
  const render_search_item = function(row) {
    return <SearchResult row={row} navigation={navigation}/>;
  };
  
  const on_explore_segment_value_change = function(value) {
    set_segment_value(value);
    const search_text = (searchbar_text || "").trim();
    if (segment_value === "users") {
      search_users(search_text);
    } else if (segment_value === "emojis") {
      search_emojis(search_text);
    }
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={"Search"} />
      </Appbar.Header>
      <View style={{flex: 1}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <View style={{flex:1}}><Searchbar ref={ref_explore_searchbar} placeholder="Search" onChangeText={local_on_searchbar_change_text} value={searchbar_text} autoCapitalize={false} autoCorrect={false} autoComplete="none"/></View>
        </View>
          <View style={{flex:1}}>
            <SegmentedButtons
              style={{marginVertical: 4, alignSelf: "center"}}
              value={segment_value}
              onValueChange={on_explore_segment_value_change}
              buttons={[
                {
                  icon: "account",
                  value: "users",
                  label: "Users",
                },
                {
                  icon: "emoticon-neutral-outline",
                  value: "emojis",
                  label: "Emojis",
                }
              ]}
            />
            <Divider style={{marginVertical: 4}}/>
            <View style={{flex: 1}}>
              <FlashList
                keyboardShouldPersistTaps="always"
                data={search_data.data}
                renderItem={render_search_item}
                keyExtractor = { item => item.id || item.char }
                ListEmptyComponent = {_.isArray(search_data.data) ? <View style={{marginTop: 40, alignItems: "center"}}><Text>Nothing found!</Text></View> : undefined}
                estimatedItemSize={segment_value === "users" ? 100 : 60}
              />
            </View>
          </View>

      </View>
    </SafeAreaView>

  );
};


export default SearchScreen;