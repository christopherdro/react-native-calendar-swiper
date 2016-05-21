const React = require('react-native');
const moment = require('moment');
const Day = require('./day');
const styles = require('./styles');
const { PropTypes } = React;

const {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} = React;

const DEVICE_WIDTH = Dimensions.get('window').width;
const VIEW_INDEX = 2;

function prepareEventDates(eventDates) {
  const res = {};
  for (const _date of eventDates) {
    const date = moment(_date);
    const month = moment(date).startOf('month').format();
    if (!res[month]) {
      res[month] = {};
    }
    res[month][date.date() - 1] = true;
  }
  return res;
}


// Short rant on localizing the calendar:
// - Date.toLocaleString is so buggy (on RN) I couldn't use it
// - moment.js is so buggy (partially but not entirely because of RN) I decided not to use it
// - discouradged by these findings, I rather sticked to good old 'what you set is what you get'
//   approach with English as a default

class Calendar extends React.Component {

  constructor(props) {
    super(props);
    this.renderTopBar = this.renderTopBar.bind(this);
    this.renderHeading = this.renderHeading.bind(this);
    this.getMonthStack = this.getMonthStack.bind(this);
    this._selectDate = this._selectDate.bind(this);
    this._onPrev = this._onPrev.bind(this);
    this._onNext = this._onNext.bind(this);
    this.renderMonthView = this.renderMonthView.bind(this);
    this._scrollEnded = this._scrollEnded.bind(this);
    this._scrollToItem = this._scrollToItem.bind(this);
    this.state = {
      selectedMoment: moment(this.props.selectedDate),
      currentMonthMoment: moment(this.props.startDate),
    };
  }

  componentDidMount() {
    this._scrollToItem(VIEW_INDEX);
  }

  componentDidUpdate() {
    this._scrollToItem(VIEW_INDEX);
  }

  getMonthStack(currentMonth) {
    if (this.props.scrollEnabled) {
      const res = [];
      for (let i = -VIEW_INDEX; i <= VIEW_INDEX; i++) {
        res.push(moment(currentMonth).add(i, 'month'));
      }
      return res;
    }
    return [moment(currentMonth)];
  }

  _selectDate(date) {
    this.setState({
      selectedMoment: date,
    });
    this.props.onDateSelect && this.props.onDateSelect(date.format()); // eslint-disable-line no-unused-expressions, max-len
  }

  _onPrev() {
    const newMoment = moment(this.state.currentMonthMoment).add(-1, 'month');
    this.setState({ currentMonthMoment: newMoment });
    this.props.onTouchPrev && this.props.onTouchPrev(newMoment); // eslint-disable-line no-unused-expressions, max-len
  }

  _onNext() {
    const newMoment = moment(this.state.currentMonthMoment).add(1, 'month');
    this.setState({ currentMonthMoment: newMoment });
    this.props.onTouchPrev && this.props.onTouchPrev(newMoment); // eslint-disable-line no-unused-expressions, max-len
  }

  _scrollToItem(itemIndex) {
    const scrollToX = itemIndex * DEVICE_WIDTH;
    if (this.props.scrollEnabled) {
      this.refs.calendar.scrollTo({ y: 0, x: scrollToX, animated: false });
    }
  }

  _scrollEnded(event) {
    const position = event.nativeEvent.contentOffset.x;
    const currentPage = position / DEVICE_WIDTH;
    const newMoment = moment(this.state.currentMonthMoment).add(currentPage - VIEW_INDEX, 'month');
    this.setState({ currentMonthMoment: newMoment });
  }

  renderMonthView(argMoment, eventDatesMap) {
    /*
      In the code bellow. several moments and datatypes are mentioned. To avoid confusion,
      here is the naming convention I used:

      Moments:
        arg - (any) date in a month we want to render
        today - day rendered as today. typically the moment of rendering
        selected moment

      Data types:
        moment - moment.js object
        index - 0, 1, 2, .. :) Typically index of day within a given month
    */

    let // eslint-disable-line one-var
      renderIndex = 0,
      weekRows = [],
      days = [],
      startOfArgMonthMoment = argMoment.startOf('month');

    const // eslint-disable-line one-var
      selectedMoment = moment(this.state.selectedMoment),
      weekStart = this.props.weekStart,
      todayMoment = moment(this.props.today),
      todayIndex = todayMoment.date() - 1,
      argMonthDaysCount = argMoment.daysInMonth(),
      offset = (startOfArgMonthMoment.isoWeekday() - weekStart + 7) % 7,
      argMonthIsToday = argMoment.isSame(todayMoment, 'month'),
      selectedIndex = moment(selectedMoment).date() - 1,
      selectedMonthIsArg = selectedMoment.isSame(argMoment, 'month');

    const events = (eventDatesMap !== null)
      ? eventDatesMap[argMoment.startOf('month').format()]
      : null;

    // let before = (new Date()).getTime()

    for (;;) {
      const dayIndex = renderIndex - offset;
      const isoWeekday = (renderIndex + weekStart) % 7;

      if (dayIndex >= 0 && dayIndex < argMonthDaysCount) {
        days.push((
          <Day
            startOfMonth={startOfArgMonthMoment}
            isWeekend={isoWeekday === 0 || isoWeekday === 6}
            key={`${renderIndex}`}
            onPress={() => {
              this._selectDate(moment(startOfArgMonthMoment).set('date', dayIndex + 1));
            }}
            caption={`${dayIndex + 1}`}
            isToday={argMonthIsToday && (dayIndex === todayIndex)}
            isSelected={selectedMonthIsArg && (dayIndex === selectedIndex)}
            hasEvent={events && events[dayIndex] === true}
            usingEvents={this.props.eventDates.length > 0}
            customStyle={this.props.customStyle}
          />
        ));
      } else {
        days.push(<Day key={`${renderIndex}`} filler />);
      }
      if (renderIndex % 7 === 6) {
        weekRows.push(
          <View
            key={weekRows.length}
            style={[styles.weekRow, this.props.customStyle.weekRow]}
          >
              {days}
          </View>);
        days = [];
        if (dayIndex + 1 >= argMonthDaysCount) {
          break;
        }
      }
      renderIndex += 1;
    }

    // let after = (new Date()).getTime()
    // console.log('--- render time ---', after - before)
    return <View key={argMoment.month()} style={styles.monthContainer}>{weekRows}</View>;
  }

  renderHeading() {
    const headings = [];
    for (let i = 0; i < 7; i++) {
      const j = (i + this.props.weekStart) % 7;
      headings.push(
        <Text
          key={i}
          style={j === 0 || j === 6 ?
            [styles.weekendHeading, this.props.customStyle.weekendHeading] :
            [styles.dayHeading, this.props.customStyle.dayHeading]}
        >
          {this.props.dayHeadings[j]}
        </Text>
      );
    }

    return (
      <View style={[styles.calendarHeading, this.props.customStyle.calendarHeading]}>
        {headings}
      </View>
    );
  }

  renderTopBar() {
    let localizedMonth = this.props.monthNames[this.state.currentMonthMoment.month()];
    return this.props.showControls
    ? (
        <View style={[styles.calendarControls, this.props.customStyle.calendarControls]}>
          <TouchableOpacity
            style={[styles.controlButton, this.props.customStyle.controlButton]}
            onPress={this._onPrev}
          >
            <Text style={[styles.controlButtonText, this.props.customStyle.controlButtonText]}>
              {this.props.prevButtonText}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, this.props.customStyle.title]}>
            {localizedMonth} {this.state.currentMonthMoment.year()}
          </Text>
          <TouchableOpacity
            style={[styles.controlButton, this.props.customStyle.controlButton]}
            onPress={this._onNext}
          >
            <Text style={[styles.controlButtonText, this.props.customStyle.controlButtonText]}>
              {this.props.nextButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      )
    : (
      <View style={[styles.calendarControls, this.props.customStyle.calendarControls]}>
        <Text style={[styles.title, this.props.customStyle.title]}>
          {this.state.currentMonthMoment.format(this.props.titleFormat)}
        </Text>
      </View>
    );
  }

  render() {
    const calendarDates = this.getMonthStack(this.state.currentMonthMoment);
    const eventDatesMap = prepareEventDates(this.props.eventDates);
    return (
      <View style={[styles.calendarContainer, this.props.customStyle.calendarContainer]}>
        {this.renderTopBar()}
        {this.renderHeading(this.props.titleFormat)}
        {this.props.scrollEnabled ?
          <ScrollView
            ref="calendar"
            horizontal
            scrollEnabled
            pagingEnabled
            removeClippedSubviews
            scrollEventThrottle={1000}
            showsHorizontalScrollIndicator={false}
            automaticallyAdjustContentInsets
            onMomentumScrollEnd={(event) => this._scrollEnded(event)}
          >
            {calendarDates.map((date) => this.renderMonthView(moment(date), eventDatesMap))}
          </ScrollView>
          :
          <View ref="calendar">
            {calendarDates.map((date) => this.renderMonthView(moment(date), eventDatesMap))}
          </View>
        }
      </View>
    );
  }
}

Calendar.defaultProps = {
  scrollEnabled: false,
  showControls: false,
  prevButtonText: 'Prev',
  nextButtonText: 'Next',
  titleFormat: 'MMMM YYYY',
  dayHeadings: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],
  startDate: moment().format('YYYY-MM-DD'),
  eventDates: [],
  customStyle: {},
  weekStart: 1,
  today: moment(),
};

Calendar.propTypes = {
  onDateSelect: PropTypes.func,
  scrollEnabled: PropTypes.bool,
  showControls: PropTypes.bool,
  prevButtonText: PropTypes.string,
  nextButtonText: PropTypes.string,
  titleFormat: PropTypes.string,
  onSwipeNext: PropTypes.func,
  onSwipePrev: PropTypes.func,
  onTouchNext: PropTypes.func,
  onTouchPrev: PropTypes.func,
  // all Date types can be anything that moment.js can parse to a proper moment.
  // Most common cases are: Date object, date string, Moment object.
  startDate: PropTypes.any,
  selectedDate: PropTypes.any,
  // defaults to, well, today. The moment of rendering.
  today: PropTypes.any,
  eventDates: PropTypes.array, // array of anythng date-like, see comment above
  customStyle: PropTypes.object,
  // 0 - Sunday, 1 - Monday, 2 - Tuesday, etc (typically 0 or 1)
  weekStart: PropTypes.number,
  // array of weekday labels, starting with Sunday
  dayHeadings: PropTypes.array,
  // array of 12 month names, defaults to English
  monthNames: PropTypes.array,
};

module.exports = Calendar;
