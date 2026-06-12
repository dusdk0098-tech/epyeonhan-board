Unicode true
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
ShowInstDetails nevershow

!include FileFunc.nsh
!include LogicLib.nsh

!ifndef FULL_INSTALLER
  !error "FULL_INSTALLER is required"
!endif

!ifndef BRIDGE_OUTFILE
  !error "BRIDGE_OUTFILE is required"
!endif

Name "PEDIT Update"
OutFile "${BRIDGE_OUTFILE}"

!ifdef BRIDGE_ICON
  Icon "${BRIDGE_ICON}"
!endif

Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "/oname=$PLUGINSDIR\PEDIT-full-setup.exe" "${FULL_INSTALLER}"

  ${GetParameters} $R0
  Call ResolveInstallArguments
  Push "bridge started params=[$R0] fullArgs=[$R1]"
  Call WriteBridgeLog

  ExecShellWait "runas" "$PLUGINSDIR\PEDIT-full-setup.exe" "$R1" SW_SHOWNORMAL
  Pop $0
  Push "full installer exitCode=$0"
  Call WriteBridgeLog
  SetErrorLevel $0
SectionEnd

Function ResolveInstallArguments
  ReadEnvStr $R2 "PEDIT_UPDATE_INSTALL_DIR"
  ${If} $R2 == ""
    ${GetOptions} "$R0" "/D=" $R2
    ${If} ${Errors}
      StrCpy $R2 "$PROGRAMFILES64\epyeonhan-board"
      ${If} $R2 == "\epyeonhan-board"
        StrCpy $R2 "$PROGRAMFILES\epyeonhan-board"
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ReadEnvStr $R3 "PEDIT_UPDATE_INSTALL_MODE"
  ${If} $R3 != "/currentuser"
    StrCpy $R3 "/allusers"
    ${GetOptions} "$R0" "/currentuser" $R4
    ${IfNot} ${Errors}
      StrCpy $R3 "/currentuser"
    ${EndIf}
  ${EndIf}

  ; NSIS requires /D=... to be last and unquoted. Build the final command
  ; line inside the bridge instead of forwarding a possibly quoted /D argument.
  StrCpy $R1 "/S $R3 /updated /D=$R2"
FunctionEnd

Function WriteBridgeLog
  Exch $9
  CreateDirectory "$TEMP\epyeonhan-board-updates"
  FileOpen $8 "$TEMP\epyeonhan-board-updates\update-bridge.log" a
  ${IfNot} ${Errors}
    FileWrite $8 "$9$\r$\n"
    FileClose $8
  ${EndIf}
  Pop $9
FunctionEnd
