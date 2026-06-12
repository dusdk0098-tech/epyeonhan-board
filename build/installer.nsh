!macro customInit
  ${if} ${isUpdated}
    SetSilent silent
    Call PeditWaitForUpdatedAppToExit
  ${endif}
!macroend

!macro customInstall
  ${if} ${isUpdated}
    ${ifNot} ${FileExists} "$newDesktopLink"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${endif}

    ${ifNot} ${FileExists} "$newStartMenuLink"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
    ${endif}

    ${if} ${Silent}
      ${ifNot} ${isForceRun}
        HideWindow
        ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
      ${endif}
    ${endif}
  ${endif}
!macroend

!ifndef BUILD_UNINSTALLER
  Function PeditWaitForUpdatedAppToExit
    StrCpy $0 0

    retryWaitForApp:
      nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "$$processes = Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and $$_.Path.StartsWith('$INSTDIR', 'CurrentCultureIgnoreCase') }; if ($$processes) { exit 0 } else { exit 1 }"`
      Pop $1
      Pop $2

      StrCmp $1 0 appStillRunning appClosed

    appStillRunning:
      IntOp $0 $0 + 1
      IntCmp $0 3 forceCloseApp waitBeforeRetry forceCloseApp

    forceCloseApp:
      nsExec::ExecToStack `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and $$_.Path.StartsWith('$INSTDIR', 'CurrentCultureIgnoreCase') } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }"`
      Pop $3
      Pop $4

    waitBeforeRetry:
      Sleep 1000
      IntCmp $0 10 appClosed retryWaitForApp appClosed

    appClosed:
  FunctionEnd
!endif
