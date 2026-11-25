const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private (Student & Instructor)
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Instructor broadcasts a notification to students
// @route   POST /api/notifications/broadcast
// @access  Private (Instructor only)
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, category = 'all', type = 'general', link = '' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    const query = { role: 'student', isDeleted: false };
    if (category && category !== 'all') {
      query.category = { $in: [category, 'Both'] };
    }

    const targetStudents = await User.find(query).select('_id');

    const notifs = targetStudents.map((s) => ({
      recipient: s._id,
      title,
      message,
      type,
      link,
    }));

    if (notifs.length > 0) {
      await Notification.insertMany(notifs);
    }

    res.status(201).json({
      success: true,
      message: `Broadcast sent to ${notifs.length} students`,
      recipientCount: notifs.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
};
