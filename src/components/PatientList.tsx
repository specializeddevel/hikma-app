import React, { Component, useState, useEffect, useRef } from "react";
import { View, Text, Image as Image, TextInput, FlatList, StyleSheet, TouchableOpacity, ImageBackground, ImageBackgroundBase, ImageSourcePropType, Platform, Picker } from "react-native";
import RNFS from 'react-native-fs';
import LinearGradient from 'react-native-linear-gradient';
import { database } from "../storage/Database";
import { DatabaseSync } from "../storage/Sync";
import { ImageSync } from '../storage/ImageSync';
import styles from './Style';
import { iconHash } from '../services/hash'
import { LocalizedStrings } from '../enums/LocalizedStrings';
import { icons } from '../enums/Icons';

const PatientList = (props) => {
  const databaseSync: DatabaseSync = new DatabaseSync();
  const imageSync: ImageSync = new ImageSync();
  const email = props.navigation.state.params.email;
  const password = props.navigation.state.params.password;
  const clinicId = props.navigation.state.params.clinicId;
  const instanceUrl = props.navigation.state.params.instanceUrl;
  const [userId, setUserId] = useState(props.navigation.state.params.userId);
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [language, setLanguage] = useState(props.navigation.getParam('language', 'en'));
  const search = useRef(null);

  useEffect(() => {
    reloadPatients()
  }, [props.navigation.state.params.reloadPatientsToggle, language])

  useEffect(() => {
    const lowerCaseQuery = query.toLowerCase();
    const newList = list
      .filter((patient) =>
        ((!!patient.given_name.content[language] && patient.given_name.content[language].toLowerCase().includes(lowerCaseQuery))
          || (!!patient.surname.content[language] && patient.surname.content[language].toLowerCase().includes(lowerCaseQuery))
          || (!!patient.given_name.content[language]
            && !!patient.surname.content[language]
            && `${patient.given_name.content[language].toLowerCase()} ${patient.surname.content[language].toLowerCase()}`.includes(lowerCaseQuery)
          )
        )
      );

    setFilteredList(newList);
  }, [query]);

  useEffect(() => {
    if (!!props.navigation.getParam('language') && language !== props.navigation.getParam('language')) {
      setLanguage(props.navigation.getParam('language'));
    }
  }, [props])

  const keyExtractor = (item, index) => index.toString()

  const reloadPatients = () => {
    database.getPatients().then(patients => {
      setList(patients);
      setFilteredList(patients);
      setQuery('');
    })
  }

  const LanguageToggle = () => {
    return (
      <Picker
        selectedValue={language}
        onValueChange={value => setLanguage(value)}
        style={styles.picker}
      >
        <Picker.Item value='en' label='en' />
        <Picker.Item value='ar' label='ar' />
        <Picker.Item value='sp' label='sp' />
      </Picker>
    )
  }

  const logout = () => {
    setUserId('')
    props.navigation.navigate('Home')
  }

  const displayName = (item) => {
    if (!!item.given_name.content[language] && !!item.surname.content[language]) {
      return <Text>{`${item.given_name.content[language]} ${item.surname.content[language]}`}</Text>
    } else {
      item.given_name.content[Object.keys(item.given_name.content)[0]]
      return <Text>{`${item.given_name.content[Object.keys(item.given_name.content)[0]]} ${item.surname.content[Object.keys(item.surname.content)[0]]}`}</Text>
    }
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => props.navigation.navigate('PatientView',
      {
        language: language,
        patient: item,
        reloadPatientsToggle: props.navigation.state.params.reloadPatientsToggle,
        clinicId: clinicId,
        userId: userId
      }
    )}>
      <View style={styles.cardContent}>
        {!!item.image_timestamp ?
          <ImageBackground source={{ uri: `${imageSync.imgURI(item.id)}/${item.image_timestamp}.jpg` }} style={{ width: 100, height: 100, justifyContent: 'center' }}>
            <View style={styles.hexagon}>
              <View style={styles.hexagonBefore} />
              <View style={styles.hexagonAfter} />
            </View>
          </ImageBackground> :
          <Image source={icons[iconHash(item.id)]} style={{ width: 100, height: 100, justifyContent: 'center' }} />}
        <View style={{ flexShrink: 1, marginLeft: 20 }}>
          {displayName(item)}
          <View
            style={{
              marginVertical: 5,
              borderBottomColor: 'black',
              borderBottomWidth: 1,
            }}
          />
          <Text style={{flexWrap: 'wrap'}}>{`${LocalizedStrings[language].dob}:  ${item.date_of_birth}`}</Text>
          <Text>{`${LocalizedStrings[language].sex}:  ${item.sex}`}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <LinearGradient colors={['#31BBF3', '#4D7FFF']} style={styles.main}>
      <View style={styles.listContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholderTextColor='#FFFFFF'
            placeholder={LocalizedStrings[language].patients}
            onChangeText={(text) => setQuery(text)}
            value={query}
            ref={search}
          />
          <TouchableOpacity onPress={() => search.current.focus()}>
            <Image source={require('../images/search.jpg')} style={{ width: 30, height: 30 }} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.text}>{`${LocalizedStrings[language].welcome}, ${email}`}</Text>
        </View>
        <View style={[styles.searchBar, { marginTop: 0, justifyContent: 'center' }]}>
          {LanguageToggle()}
          <TouchableOpacity onPress={async () => {
            await databaseSync.performSync(instanceUrl, email, password)
            await imageSync.syncPhotos(instanceUrl, email, password)
            reloadPatients()
          }}
            style={{ marginLeft: 50, marginRight: 100 }}>
            <Image source={require('../images/sync.png')} style={{ width: 30, height: 30 }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => logout()}>
            <Image source={require('../images/logout.png')} style={{ width: 30, height: 30 }} />
          </TouchableOpacity>
        </View>
        <View style={styles.scroll}>
          <FlatList
            keyExtractor={keyExtractor}
            data={filteredList}
            renderItem={(item) => renderItem(item)}
          />
        </View>

        <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
          <TouchableOpacity onPress={() => props.navigation.navigate('NewPatient',
            {
              reloadPatientsToggle: props.navigation.state.params.reloadPatientsToggle,
              language: language
            }
          )}>
            <Image source={require('../images/newVisit.png')} style={{ width: 75, height: 75 }} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )

}

export default PatientList;