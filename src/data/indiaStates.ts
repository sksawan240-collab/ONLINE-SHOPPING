/**
 * Single source of truth for Indian geography used across the store.
 * Contains all 28 States and 8 Union Territories of India along with
 * their districts (as per Government of India / Census district lists).
 */

export interface IndianState {
  name: string;
  type: 'STATE' | 'UNION_TERRITORY';
  districts: string[];
}

export const INDIAN_STATES: IndianState[] = [
  // ------------------------- STATES -------------------------
  {
    name: 'Andhra Pradesh',
    type: 'STATE',
    districts: [
      'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
      'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
      'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu',
      'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Srikakulam',
      'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa',
    ],
  },
  {
    name: 'Arunachal Pradesh',
    type: 'STATE',
    districts: [
      'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
      'Itanagar Capital Complex', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada',
      'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri',
      'Namsai', 'Pakke-Kessang', 'Papum Pare', 'Shi Yomi', 'Siang',
      'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng',
      'West Siang',
    ],
  },
  {
    name: 'Assam',
    type: 'STATE',
    districts: [
      'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar',
      'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri',
      'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi',
      'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong (East)',
      'Karbi Anglong West', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli',
      'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur',
      'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong',
    ],
  },
  {
    name: 'Bihar',
    type: 'STATE',
    districts: [
      'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
      'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhaga', 'East Champaran (Motihari)',
      'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
      'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
      'Madhubani', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna',
      'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran',
      'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul',
      'Vaishali', 'West Champaran (Bettiah)',
    ],
  },
  {
    name: 'Chhattisgarh',
    type: 'STATE',
    districts: [
      'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara',
      'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg',
      'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
      'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Korea (Koriya)', 'Mahasamund',
      'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur', 'Raigarh',
      'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma',
      'Surajpur', 'Udaipur (Chhattisgarh)',
    ],
  },
  {
    name: 'Goa',
    type: 'STATE',
    districts: ['North Goa', 'South Goa'],
  },
  {
    name: 'Gujarat',
    type: 'STATE',
    districts: [
      'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
      'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
      'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
      'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana',
      'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
      'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
      'Tapi', 'Vadodara', 'Valsad',
    ],
  },
  {
    name: 'Haryana',
    type: 'STATE',
    districts: [
      'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
      'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal',
      'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
      'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
      'Sonipat', 'Yamunanagar',
    ],
  },
  {
    name: 'Himachal Pradesh',
    type: 'STATE',
    districts: [
      'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur',
      'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur',
      'Solan', 'Una',
    ],
  },
  {
    name: 'Jharkhand',
    type: 'STATE',
    districts: [
      'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
      'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
      'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
      'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
      'Sahibganj', 'Saraikela-Kharsawan', 'Simdega', 'West Singhbhum',
    ],
  },
  {
    name: 'Karnataka',
    type: 'STATE',
    districts: [
      'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
      'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
      'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
      'Haveri', 'Kalaburagi (Gulbarga)', 'Kodagu', 'Kolar', 'Koppal',
      'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
      'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Vijayanagara',
      'Yadgir',
    ],
  },
  {
    name: 'Kerala',
    type: 'STATE',
    districts: [
      'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
      'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
      'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad',
    ],
  },
  {
    name: 'Madhya Pradesh',
    type: 'STATE',
    districts: [
      'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Badwani',
      'Betul', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara',
      'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori',
      'Guna', 'Gwalior', 'Harda', 'Hoshangabad (Narmadapuram)', 'Indore',
      'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone',
      'Maihar', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur',
      'Neemuch', 'Niwari', 'Pandhurna', 'Panna', 'Raisen',
      'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna',
      'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur',
      'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain',
      'Umaria', 'Vidisha',
    ],
  },
  {
    name: 'Maharashtra',
    type: 'STATE',
    districts: [
      'Ahmednagar', 'Akola', 'Amravati', 'Chh. Sambhajinagar (Aurangabad)', 'Beed',
      'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli',
      'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
      'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
      'Nandurbar', 'Nashik', 'Dharashiv (Osmanabad)', 'Palghar', 'Parbhani',
      'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
      'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim',
      'Yavatmal',
    ],
  },
  {
    name: 'Manipur',
    type: 'STATE',
    districts: [
      'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
      'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney',
      'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal',
      'Ukhrul',
    ],
  },
  {
    name: 'Meghalaya',
    type: 'STATE',
    districts: [
      'Eastern West Khasi Hills', 'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills',
      'Ri-Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills',
      'West Jaintia Hills', 'West Khasi Hills',
    ],
  },
  {
    name: 'Mizoram',
    type: 'STATE',
    districts: [
      'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib',
      'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual',
      'Serchhip',
    ],
  },
  {
    name: 'Nagaland',
    type: 'STATE',
    districts: [
      'Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng',
      'Mon', 'Mokokchung', 'Niuland', 'Noklak', 'Peren',
      'Phek', 'Tseminyu', 'Tuensang', 'Wokha', 'Zunheboto',
    ],
  },
  {
    name: 'Odisha',
    type: 'STATE',
    districts: [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak',
      'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati',
      'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
      'Kandhamal', 'Kendrapada', 'Keonjhar (Kendujhar)', 'Khordha', 'Koraput',
      'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
      'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur (Sonepur)', 'Sundargarh',
    ],
  },
  {
    name: 'Punjab',
    type: 'STATE',
    districts: [
      'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fazilka',
      'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala',
      'Ludhiana', 'Mansa', 'Moga', 'Muktsar Sahib', 'Pathankot',
      'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)', 'Sangrur', 'Shahid Bhagat Singh Nagar (Nawanshahr)',
      'Sri Ganganagar', 'Tarn Taran',
    ],
  },
  {
    name: 'Rajasthan',
    type: 'STATE',
    districts: [
      'Ajmer', 'Alwar', 'Balotra', 'Banswara', 'Baran',
      'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara', 'Bikaner',
      'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Deedwana-Kuchaman',
      'Didwana-Kuchaman', 'Dholpur', 'Dungarpur', 'Gangapur', 'Hanumangarh',
      'Jaipur', 'Jaipur Rural', 'Jaisalmer', 'Jalore', 'Jhalawar',
      'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kekri', 'Khairthal-Tijara',
      'Kota', 'Kotputli-Behror', 'Nagaur', 'Pali', 'Phalodi',
      'Pratapgarh', 'Rajsamand', 'Sanchore', 'Sawai Madhopur', 'Sikar',
      'Sirohi', 'Tonk', 'Udaipur',
    ],
  },
  {
    name: 'Sikkim',
    type: 'STATE',
    districts: ['East Sikkim', 'Gangtok', 'Mangan', 'Namchi', 'Pakyong', 'Soreng', 'West Sikkim (Gyalshing)'],
  },
  {
    name: 'Tamil Nadu',
    type: 'STATE',
    districts: [
      'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
      'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
      'Karur', 'Kanyakumari', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
      'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
      'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
      'Thoothukudi', 'Theni', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur',
      'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram',
      'Virudhunagar',
    ],
  },
  {
    name: 'Telangana',
    type: 'STATE',
    districts: [
      'Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial',
      'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
      'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial',
      'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
      'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
      'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
      'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri',
    ],
  },
  {
    name: 'Tripura',
    type: 'STATE',
    districts: [
      'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala',
      'South Tripura', 'Unakoti', 'West Tripura',
    ],
  },
  {
    name: 'Uttar Pradesh',
    type: 'STATE',
    districts: [
      'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha (J.P. Nagar)',
      'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia',
      'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti',
      'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli',
      'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad',
      'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur',
      'Gonda', 'Gorakhpur', 'Hamirpur', 'Hardoi', 'Hathras',
      'Jalaun', 'Jaunpur', 'Jhansi', 'Kanpur Dehat', 'Kanpur Nagar',
      'Kasganj', 'Kaushambi', 'Kheri (Lakhimpur)', 'Kushinagar', 'Lalitpur',
      'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura',
      'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
      'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur',
      'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shamli', 'Shravasti',
      'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao',
      'Varanasi',
    ],
  },
  {
    name: 'Uttarakhand',
    type: 'STATE',
    districts: [
      'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
      'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag',
      'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi',
    ],
  },
  {
    name: 'West Bengal',
    type: 'STATE',
    districts: [
      'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Darjeeling',
      'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
      'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
      'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia',
      'South 24 Parganas', 'Uttar Dinajpur',
    ],
  },

  // ------------------- UNION TERRITORIES -------------------
  {
    name: 'Andaman and Nicobar Islands',
    type: 'UNION_TERRITORY',
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  },
  {
    name: 'Chandigarh',
    type: 'UNION_TERRITORY',
    districts: ['Chandigarh'],
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    type: 'UNION_TERRITORY',
    districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  },
  {
    name: 'Delhi',
    type: 'UNION_TERRITORY',
    districts: [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi',
      'West Delhi',
    ],
  },
  {
    name: 'Jammu and Kashmir',
    type: 'UNION_TERRITORY',
    districts: [
      'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda',
      'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam',
      'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban',
      'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur',
    ],
  },
  {
    name: 'Ladakh',
    type: 'UNION_TERRITORY',
    districts: ['Kargil', 'Leh'],
  },
  {
    name: 'Lakshadweep',
    type: 'UNION_TERRITORY',
    districts: ['Lakshadweep'],
  },
  {
    name: 'Puducherry',
    type: 'UNION_TERRITORY',
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  },
];

/** Plain list of state / UT names for dropdowns. */
export const INDIAN_STATE_NAMES: string[] = INDIAN_STATES.map(s => s.name);

/** The default country used across the store. */
export const DEFAULT_COUNTRY = 'India';

/** Returns the district list for a given state / UT name (empty array if unknown). */
export const getDistrictsForState = (stateName?: string | null): string[] => {
  if (!stateName) return [];
  const entry = INDIAN_STATES.find(
    s => s.name.toLowerCase() === stateName.trim().toLowerCase()
  );
  return entry ? entry.districts : [];
};

/**
 * Indian PIN codes are exactly 6 digits and never start with 0.
 * e.g. 585102 (Kalaburagi), 400001 (Mumbai), 110001 (New Delhi).
 */
export const isValidIndianPinCode = (pin: string): boolean =>
  /^[1-9][0-9]{5}$/.test((pin || '').trim());
