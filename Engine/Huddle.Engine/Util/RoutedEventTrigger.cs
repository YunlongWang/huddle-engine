﻿using System;
using System.Windows;
using System.Windows.Interactivity;
using EventTrigger = System.Windows.Interactivity.EventTrigger;

namespace Huddle.Engine.Util
{
    public class RoutedEventTrigger : EventTriggerBase<DependencyObject>
    {
        public RoutedEvent RoutedEvent { get; set; }

        protected override void OnAttached()
        {
            Behavior behavior = base.AssociatedObject as Behavior;
            FrameworkElement associatedElement = base.AssociatedObject as FrameworkElement;

            if (behavior != null)
            {
                associatedElement = ((IAttachedObject)behavior).AssociatedObject as FrameworkElement;
            }
            if (associatedElement == null)
            {
                throw new ArgumentException("Routed Event trigger can only be associated to framework elements");
            }
            if (RoutedEvent != null)
            {
                associatedElement.AddHandler(RoutedEvent, new RoutedEventHandler(this.OnRoutedEvent));
            }
        }
        protected virtual void OnRoutedEvent(object sender, RoutedEventArgs args)
        {
            if (args != null)
                base.OnEvent(args);
        }
        protected override string GetEventName()
        {
            return RoutedEvent.Name;
        }
    }

    public class RoutedEventTriggerAdvanced : RoutedEventTrigger
    {
        protected override void OnRoutedEvent(object sender, RoutedEventArgs args)
        {
            base.OnEvent(new SenderAwareEventArgs { Sender = sender, OriginalEventArgs = args });
        }
    }

    public class EventTriggerAdvanced : EventTrigger
    {
        #region Sender

        public object Sender
        {
            get { return (object)GetValue(SenderProperty); }
            set { SetValue(SenderProperty, value); }
        }

        // Using a DependencyProperty as the backing store for Sender.  This enables animation, styling, binding, etc...
        public static readonly DependencyProperty SenderProperty =
            DependencyProperty.Register("Sender", typeof(object), typeof(EventTriggerAdvanced), new PropertyMetadata(null));

        #endregion

        protected override void OnEvent(EventArgs eventArgs)
        {
            base.OnEvent(new SenderAwareEventArgs { Sender = Sender ?? Source, OriginalEventArgs = eventArgs });
        }
    }

    public class SenderAwareEventArgs : EventArgs
    {
        public object Sender { get; set; }
        public EventArgs OriginalEventArgs { get; set; }
    }
}