/* global fetch */
"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, List, Searchbar} from "react-native-paper";
import { useSnapshot } from "valtio";

const Location = function({location, on_press}) {
  
  const local_on_press = function() {
    on_press(location);
  };
  
  if (location.properties) {
    const label_tokens = location.properties.label.split(",");
    const label = _.rest(label_tokens).join(",").trim();
    return <List.Section><List.Item title={location.properties.name} description={label} onPress={local_on_press}/></List.Section>;
  } else {
    return <List.Section><List.Item title={location.address_line1} onPress={local_on_press}/></List.Section>; 
  }
};

const LocationEditScreen = function({navigation}) {
  const [searchbar_text, set_searchbar_text] = useState();
  
  const snap_session = useSnapshot($.session);
  
  const on_press_back = function() {
    delete $.session.location_autocomplete_data;
    navigation.goBack();
  };
  
  const do_search = _.debounce(async function(query) {
    const autocomplete_url = $.config.geocode.api_endpoint + "/v1/autocomplete?api_key=" + $.config.geocode.api_key + "&focus.point.lat=" + $.session.location.coords.latitude + "&focus.point.lon=" + $.session.location.coords.longitude + "&layers=venue&text=" + query;
    try {
      const response = await fetch(autocomplete_url);
      const json = await response.json();
      if (query !== $.editor.search_text) {
        return;
      }
      $.session.location_autocomplete_data = json.features;
    } catch (e) {
      console.error(e);
    }
  }, 250);
  
  const local_on_searchbar_change_text = function(text) {
    set_searchbar_text(text);
    const search_text = text.trim();
    if (search_text === "") {
      delete $.session.location_autocomplete_data;
      return;
    }
    $.editor.search_text = search_text;
    do_search(search_text);
  };
  
  const on_press_location = function(location) {
    delete $.session.location_autocomplete_data;
    $.editor.location = location;
    console.log(location);
    navigation.goBack();
  };
  
  const render_location = function(row) {
    return <Location location={row.item} on_press={on_press_location}/>;
  };
  
  return (
    <SafeAreaView style ={{flex: 1}} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView behavior={Platform.OS == 'ios' ? 'padding' : undefined} style={{flex: 1}}>
       <Appbar.Header>
          <Appbar.BackAction onPress={on_press_back} />
          <Appbar.Content title="Location" />
        </Appbar.Header>
        <Searchbar placeholder="Search" onChangeText={local_on_searchbar_change_text} value={searchbar_text} autoCapitalize={false} autoCorrect={false} autoComplete="none"/>
        <FlatList
          keyboardShouldPersistTaps="always"
          style={{flex: 1}}
          data={snap_session.location_autocomplete_data ? snap_session.location_autocomplete_data : snap_session.coarse_location_data}
          renderItem={render_location}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default LocationEditScreen;