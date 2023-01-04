"use strict";
import $ from "../setup";
import React, { useCallback, useEffect, useRef, useState}  from "react";
import _ from "underscore";
import { InteractionManager, Keyboard, View} from 'react-native';
import TouchableOpacity  from "../components/TouchableOpacity";
import { Divider, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import { FlashList } from "@shopify/flash-list";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import useSearch from "../hooks/useSearch";
import EmojiSearchResult from "../components/EmojiSearchResult";
import { useFocusEffect } from '@react-navigation/native';

const ICON_WIDTH = 40;
const ROW_HEIGHT = 50;

const EmojiTypeButton = function({group, on_press, is_disabled, is_selected}) {
  const { colors } = useTheme();
  
  const local_on_press = function() {
    on_press(group);
  };
  
  return (
    <TouchableOpacity onPress={local_on_press} disabled={is_disabled} style={{flex: 1, alignItems: "center"}}> 
      <MaterialCommunityIcons name={group.icon} color={colors.outline} size={40} style={{opacity: is_disabled ? 0.4 : 1}}/>
    </TouchableOpacity>
  );
};

const EmojiPart = function({emoji_data, onPress}) {
  const MARGIN_HORIZONTAL = ($.const.width - (ICON_WIDTH*6))/12;
  
  const on_press = function() {
    onPress(emoji_data);
  };
  
  return (
    <View key={emoji_data.char} style={{height: ROW_HEIGHT, width: ICON_WIDTH, marginHorizontal: MARGIN_HORIZONTAL}}>
      <Text onPress={on_press} style={{ fontFamily: "TwemojiMozilla", fontSize: ICON_WIDTH}}>{emoji_data.char}</Text>
    </View>
  );
};

class Emoji extends React.PureComponent {
  constructor(props) {
    super(props);
    this.on_press_emoji = this.on_press_emoji.bind(this);
  }
  
  on_press_emoji(emoji_data) {
    this.props.onPress && this.props.onPress(emoji_data);
  }
  
  render() {
    const me = this;
    if (_.isArray(me.props.item)) {
      const rendered = [];
      _.each(me.props.item, function(emoji_data, index) {
        rendered.push(<EmojiPart key={emoji_data.char} emoji_data={emoji_data} onPress={me.on_press_emoji}/>);
      });
      return <View style={{flexDirection: "row"}}>{rendered}</View>;
    } else {
      return <EmojiSearch emoji_data={me.props.item} onPress={me.on_press_emoji}/>;
    }
  }
}

const EmojiSelector = function({style, onLoaded, onSelect}) {
  const refFlatList = useRef();
  const ref_searchbar = useRef();
  const [searchText, setSearchText] = useState("");
  const [emojis, setEmojis] = useState({enabled: {}, data: []});
  const [search_text, set_search_text] = useState("");
  const { search_data, search_emojis } = useSearch();
  
  useFocusEffect(useCallback(() => {
    // wait for transition animation to finish
    InteractionManager.runAfterInteractions(() => {
      ref_searchbar.current?.focus();
    });
  }, []));
  
  useEffect(() => {
    if (searchText === "" && !_.size(emojis.data)) {
      const enabled = {};
      const data = [];
      const grouped = _.groupBy($.emoji_data, "group");
      _.each(_.keys(grouped), function(group, index) {
        data.push({is_group: true, key: group});
        if (searchText === "") {
          enabled[group] = true;
          const chunks = _.chunk(grouped[group], 6);
          _.each(chunks, function(emoji_data) {
            data.push({key: emoji_data[0].char, data: emoji_data});
          });
        } else {
          _.each(grouped[group], function(emoji_data) {
            enabled[emoji_data.group] = true;
            data.push({key: emoji_data.char, data: emoji_data});
          });
        }
      });
      setEmojis({enabled: enabled, data: data});
      return;
    } else {
      search_emojis(searchText);
    }
  }, [searchText]);
  
  const on_press = function(item) {
    onSelect(item);
  };

  const on_change_text = function(text) {
    set_search_text(text);
    const val = text.trim().toLowerCase();
    setSearchText(val);
  };
  
  const on_press_emoji_type = function(group) {
    Keyboard.dismiss();
    let item;
    _.each(emojis.data, function(row, idx) {
      if (row.is_group&& row.key === group.name) {
        item = row;
      }
    });

    refFlatList.current.scrollToItem({
      item: item,
      animated: false
    });
  };
  
  const render = function({item, index}) {
    if (item.is_group) {
      return <View style={{height: 50}}><Surface style={{paddingVertical: 2, paddingLeft: 10, marginVertical: index === 0 ? 0 : 10}}><Text variant="titleMedium" style={{}}>{item.key}</Text></Surface></View>;
    }
    return searchText !== "" ? <EmojiSearchResult emoji={item} on_press={on_press}/> : <Emoji item={item.data} onPress={on_press} isInSearch={(searchText !== "")} index={index}/>;
  };

  return (
    <View style={{flex:1}}>
      <Searchbar ref={ref_searchbar} placeholder="Search" onChangeText={on_change_text} value={search_text} autoCapitalize={false} autoCorrect={false} autoComplete="none"/>
      <View style={{flexDirection: "row", paddingVertical: 4}} keyboardShouldPersistTaps="always">
        <EmojiTypeButton group={$.const.emoji_groups.smileys} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.smileys.name] : !emojis.enabled[$.const.emoji_groups.smileys.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.people} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.people.name] : !emojis.enabled[$.const.emoji_groups.people.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.animals} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.animals.name] : !emojis.enabled[$.const.emoji_groups.animals.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.food} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.food.name] : !emojis.enabled[$.const.emoji_groups.food.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.travel} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.travel.name] : !emojis.enabled[$.const.emoji_groups.travel.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.activities} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.activities.name] : !emojis.enabled[$.const.emoji_groups.activities.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.objects} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.objects.name] : !emojis.enabled[$.const.emoji_groups.objects.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.symbols} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.symbols.name] : !emojis.enabled[$.const.emoji_groups.symbols.name]}/>
        <EmojiTypeButton group={$.const.emoji_groups.flags} on_press={on_press_emoji_type} is_disabled={searchText !== "" ? !search_data.is_group_enabled[$.const.emoji_groups.flags.name] : !emojis.enabled[$.const.emoji_groups.flags.name]}/>
      </View>
      <Divider/>
      <FlashList
        keyboardShouldPersistTaps="always"
        key={searchText}
        ref={refFlatList}
        data={searchText !== "" ? search_data.data : (emojis && emojis.data)}
        renderItem={render}
        keyExtractor={(item) => item.key || item.char}
        estimatedItemSize={searchText !== "" ? 60 : 49}
      />
    </View>
  );
};

export default EmojiSelector;