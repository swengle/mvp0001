"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Appbar, Avatar, Divider, Searchbar, SegmentedButtons, Text, useTheme } from "react-native-paper";
import TouchableOpacity  from "../../components/TouchableOpacity";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useSearch from "../../hooks/useSearch";
import EmojiSearchResult from "../../components/EmojiSearchResult";
import { FlashList } from "@shopify/flash-list";
import { SafeAreaView } from 'react-native-safe-area-context';
import useGlobalCache from "../../hooks/useGlobalCache";

const SearchResult = function({navigation, row}) {
  const { colors } = useTheme();
  if (row.item.id) {
    const { cache_get_snapshot } = useGlobalCache();
    const snap_user = cache_get_snapshot(row.item.id);

    const on_press_user = function() {
      navigation.push("PostListScreen", {screen: "UserScreen", id: snap_user.id});
    };
    
    return (
      <View style={{flexDirection: "row", alignItems: "center", padding: 10}}>
        <TouchableOpacity onPress={on_press_user} style={{flex: 7, flexDirection: "row", alignItems: "center"}}>
          <Avatar.Image size={40} source={{uri: snap_user.profile_image_url}} style={{marginRight: 10}}/>
          <View>
            <Text variant="titleMedium">{snap_user.username}</Text>
            {snap_user.name && <Text variant="bodySmall">{snap_user.name}</Text>}
            {row && row.contact_name && <Text variant="labelMedium" style={{color: colors.outline}}><MaterialCommunityIcons name="account-box-outline" size={14} />{row.contact_name}</Text>}
          </View>
        </TouchableOpacity>
      </View>
    );
  } else if (row.item.char) {
    return <EmojiSearchResult emoji={row.item} navigation={navigation}/>;
  }
};


const SearchScreen = function({ navigation }) {
  const { search_data, search_users, search_emojis } = useSearch();
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
  
  const render_search_item = function(row) {
    return <SearchResult row={row} navigation={navigation}/>;
  };
  
  const on_explore_segment_value_change = function(value) {
    set_segment_value(value);
    const search_text = (searchbar_text || "").trim();
    if (value === "users") {
      search_users(search_text);
    } else if (value === "emojis") {
      search_emojis(search_text);
    }
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };

  return (
    <SafeAreaView style ={{flex: 1}} edges={['left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title={"Search"} />
      </Appbar.Header>
      <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={{flexDirection: "row", alignItems: "center"}}>
          <View style={{flex:1}}><Searchbar placeholder="Search" onChangeText={local_on_searchbar_change_text} value={searchbar_text} autoCapitalize={false} autoCorrect={false} autoComplete="none" autoFocus={true}/></View>
        </View>
          <SegmentedButtons
            style={{marginVertical: 8, alignSelf: "center"}}
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
          <Divider/>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default SearchScreen;