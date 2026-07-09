# Установка ARMAX Habits на iPhone/iPad

ARMAX Habits можно использовать как PWA, как Telegram Mini App и как iOS-приложение через Capacitor.

## 1. PWA без App Store

1. Запусти веб-версию и получи HTTPS-ссылку или локальную ссылку для теста.
2. Открой ссылку на iPhone/iPad именно в Safari.
3. Нажми кнопку «Поделиться».
4. Выбери «На экран “Домой”».
5. Подтверди добавление.
6. Запускай ARMAX Habits с иконки на экране Домой.

Важно: для полноценного PWA лучше использовать HTTPS-домен. Локальный `http://192.168.x.x` подходит для теста в одной Wi-Fi сети, но не является нормальным production-адресом.

## 2. Через Xcode

Нужен Mac с Xcode.

1. Установи зависимости:

```bash
npm install
```

2. Собери веб-часть и синхронизируй iOS:

```bash
npm run cap:sync
```

Если папки `ios` ещё нет:

```bash
npm run cap:add:ios
npm run cap:sync
```

3. Открой проект:

```bash
npm run ios:open
```

4. В Xcode открой `ios/App/App.xcworkspace`.
5. Выбери свой iPhone или iPad.
6. Выбери Team в Signing & Capabilities.
7. Нажми Run.
8. Если iPhone попросит доверять разработчику: Настройки → Основные → VPN и управление устройством → доверять профилю.

## 3. Через AltStore / Sideloadly

Этот способ нужен, если хочешь установить `.ipa` без App Store.

1. Собери iOS-проект через Xcode.
2. В Xcode создай архив или `.ipa`.
3. Установи `.ipa` через AltStore или Sideloadly.
4. Войди Apple ID, если инструмент попросит подпись.

Ограничения бесплатного Apple ID:

- приложение обычно нужно переподписывать примерно раз в 7 дней;
- количество установленных sideload-приложений ограничено;
- для стабильной публикации нужен Apple Developer Program.

## Важное про уведомления

- PWA на iPhone имеет ограничения.
- Web Push и локальные уведомления в PWA могут работать только после добавления приложения на экран Домой и зависят от версии iOS.
- Настоящие локальные напоминания стабильнее через Capacitor iOS и `@capacitor/local-notifications`.
- Для личной установки можно тестировать без публикации в App Store.
- Для публикации в App Store нужен Apple Developer Program, обычно 99 USD в год.

## Основные команды

```bash
npm install
npm run build
npm run cap:add:ios
npm run cap:sync
npm run ios:open
```

Для локальной проверки на iPhone в Safari:

```bash
npm run dev -- --host 0.0.0.0 --port 5175
```

Открой на iPhone адрес из строки `Network`, например:

```text
http://192.168.0.104:5175/
```
