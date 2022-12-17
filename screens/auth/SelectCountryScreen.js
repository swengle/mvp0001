"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, StyleSheet, View } from "react-native";
import TouchableOpacity  from "../../components/TouchableOpacity";
import { useSnapshot } from 'valtio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useKeyboard } from '@react-native-community/hooks';
import { Appbar, Divider, Searchbar, Text, useTheme } from 'react-native-paper';

const offset = 127397;

const CountryRow = function({cca2, navigation}) {
  const { colors } = useTheme();
  const auth_state = useSnapshot($.auth, {sync: true});
  const country = $.countries_by_cca2[cca2];
  
  const on_press_flag = function() {
    $.auth.cca2 = country.cca2;
    navigation.goBack();
  };
  
  const cc = cca2.toUpperCase();
  const flag_character = /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => c.charCodeAt() + offset)) : null;

  return (
    <View>
      <TouchableOpacity onPress={on_press_flag} style={{padding: 10, paddingTop: 4, paddingBottom: 4}}>
        <View style={{flex: 1, flexDirection: "row", alignItems: "center"}}>
          <Text style={{fontFamily: "TwemojiMozilla", fontSize: 40, marginRight: 8}}>{flag_character}</Text>
          <Text variant="titleMedium" style={{marginRight: 4}}>{country.name}</Text>
          <Text variant="bodySmall" style={{color: colors.outline}}>({country.calling_code})</Text>
          {auth_state.cca2 === country.cca2 && (
            <View style={{flex: 1}}>
              <MaterialCommunityIcons name="check-circle" size={20} style={{alignSelf: "flex-end", color: "gray"}}/>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <Divider/>
    </View>
  );
};

const ScreenSelectCountry = function({ navigation }) {
  const [countries, setCountries] = useState($.countries);
  const [search_text, set_search_text] = useState("");
  
  const render_country = function(row) {
    return (
      <CountryRow cca2={row.item.cca2} navigation={navigation}/>
    );
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_change_text = function(text) {
    set_search_text(text);
    if (text.trim().length === 0) {
      setCountries($.countries);
    } else {
      setCountries(_.filter($.countries, function(country) { 
        return (country.name.toLowerCase().indexOf(text.trim().toLowerCase()) === 0);
      }));
    }
  };
  
  const keyboardHeight = useKeyboard();
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'left']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={on_press_back} />
        <Appbar.Content title="Select Country" />
      </Appbar.Header>
      <Searchbar placeholder="Search" onChangeText={on_change_text} value={search_text} autoCapitalize={false} autoCorrect={false} autoComplete="none" autoFocus={true}/>
      <FlatList
        keyboardShouldPersistTaps="always"
        style={[{marginBottom: keyboardHeight.coordinates.end.height}, styles.flat_list]}
        data={countries}
        renderItem={render_country}
        keyExtractor = { item => item.cca2 }
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  flat_list: {
    flex: 1
  }
});

export default ScreenSelectCountry;