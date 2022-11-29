"use strict";
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { IconButton } from 'react-native-paper';

const header = function({title, left, right, on_press_back, is_modal}) {

  return (
    <View>
      {on_press_back && (
        <IconButton icon={is_modal ? "close" : "chevron-left"} mode="contained" onPress={on_press_back}/>
      )}
      <View style={styles.header_component}>
        <View style={{flexDirection: 'row', flex:1}}>
          {left && (
            <View style={styles.left}>
              {left}
            </View>
          )}
        </View>
        <View style={{flex: 2, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={styles.title}>
              {title}
          </Text>
        </View>
        <View style={[{flex: 1}]}>
          {right && (
            <View style={styles.right}>
              {right}
            </View>
          )}
        </View>
      </View>
      <Divider/>
    </View>
  );
};

const styles = StyleSheet.create({
  header_component: {
    flexDirection: 'row',
    paddingBottom: 8,
    alignItems: 'center'
  },
  title: {
    fontWeight: "bold",
    fontSize: 16
  }
});


export default header;