"use strict";
import $ from "../../setup";
import _ from "underscore";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, FlatList, StyleSheet, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSnapshot } from 'valtio';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import IconTextInput from "../../components/IconTextInput";
import Header from "../../components/Header";
import { useKeyboard } from '@react-native-community/hooks';
import Flag from "../../components/Flag";
import { Divider, Text } from 'react-native-paper';

const CountryRow = function({cca2, navigation}) {
  const auth_state = useSnapshot($.auth, {sync: true});
  const country = $.data.countries_by_cca2[cca2];
  
  const on_press_flag = function() {
    $.auth.cca2 = country.cca2;
    navigation.goBack();
  };

  return (
    <View>
      <TouchableOpacity onPress={on_press_flag} style={{padding: 10, paddingTop: 12, paddingBottom: 12}}>
        <View style={{flex: 1, flexDirection: "row", alignItems: "center"}}>
          <Flag countryCode={cca2} style={{fontFamily: "TwemojiMozilla", marginRight: 4}}/>
          <Text style={{fontWeight: "bold", fontSize: 15, marginRight: 4}}>{country.name}</Text>
          <Text style={{color: "#999", fontWeight: "bold", fontSize: 12}}>({country.calling_code})</Text>
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
  const [countries, setCountries] = useState($.data.countries);

  
  const render_country = function(row) {
    return (
      <CountryRow cca2={row.item.cca2} navigation={navigation}/>
    );
  };
  
  const on_press_back = function() {
    navigation.goBack();
  };
  
  const on_change_text = function(text) {
    if (text.trim().length === 0) {
      setCountries($.data.countries);
    } else {
      setCountries(_.filter($.data.countries, function(country) { 
        return (country.name.toLowerCase().indexOf(text.trim().toLowerCase()) === 0);
      }));
    }
  };
  
  const keyboardHeight = useKeyboard();
  return (
    <SafeAreaView style ={{flex: 1}} edges={['right', 'left']}>
      <Header title="Select Country" on_press_back={on_press_back} is_modal={true}/>
      <IconTextInput icon="search" placeholder="Search" is_auto_focus={true} on_change_text={on_change_text} style={{borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth}}/>
      <View behavior={Platform.OS == 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <FlatList
          keyboardShouldPersistTaps="always"
          style={[{marginBottom: keyboardHeight.coordinates.end.height}, styles.flat_list]}
          data={countries}
          renderItem={render_country}
          keyExtractor = { item => item.cca2 }
        />
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  flat_list: {
    flex: 1
  }
});

export default ScreenSelectCountry;